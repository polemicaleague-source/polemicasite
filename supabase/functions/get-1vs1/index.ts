import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const id1 = url.searchParams.get("id1");
  const id2 = url.searchParams.get("id2");

  if (!id1 || !id2) {
    return jsonResponse({ error: "Missing id1 and/or id2 parameters" }, 400);
  }
  if (id1 === id2) {
    return jsonResponse({ error: "id1 and id2 must be different" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get player names
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, nome")
    .in("id", [id1, id2]);

  if (pErr || !players || players.length < 2) {
    return jsonResponse({ error: "One or both players not found" }, 404);
  }

  const p1 = players.find((p) => p.id === id1)!;
  const p2 = players.find((p) => p.id === id2)!;

  // Check if a stored rivalry exists (either direction)
  const { data: rivalry } = await supabase
    .from("rivalries")
    .select("*")
    .or(
      `and(player1_id.eq.${id1},player2_id.eq.${id2}),and(player1_id.eq.${id2},player2_id.eq.${id1})`
    )
    .maybeSingle();

  // Compute head-to-head stats from match_details
  // Find all giornate where both players played
  const { data: md1 } = await supabase
    .from("match_details")
    .select("giornata, squadra, risultato, gol, assist, voto, differenza_reti")
    .eq("player_id", id1);

  const { data: md2 } = await supabase
    .from("match_details")
    .select("giornata, squadra, risultato, gol, assist, voto, differenza_reti")
    .eq("player_id", id2);

  const map1 = new Map((md1 ?? []).map((r) => [r.giornata, r]));
  const map2 = new Map((md2 ?? []).map((r) => [r.giornata, r]));

  let partiteInsieme = 0;
  let vittorieInsieme = 0;
  let sconfitteInsieme = 0;
  let partiteContro = 0;
  let vittorieP1 = 0;
  let vittorieP2 = 0;

  for (const [giornata, r1] of map1) {
    const r2 = map2.get(giornata);
    if (!r2) continue;

    if (r1.squadra === r2.squadra) {
      // Same team
      partiteInsieme++;
      if (r1.risultato === "V") vittorieInsieme++;
      if (r1.risultato === "S") sconfitteInsieme++;
    } else {
      // Opposing teams
      partiteContro++;
      if (r1.risultato === "V") vittorieP1++;
      if (r2.risultato === "V") vittorieP2++;
    }
  }

  const totalePartite = partiteInsieme + partiteContro;

  // Determine if the stored rivalry is in reverse order
  let tag: string | null = null;
  let storedStats = null;
  if (rivalry) {
    tag = rivalry.tag;
    const isReversed = rivalry.player1_id === id2;
    storedStats = {
      partite_insieme: rivalry.partite_insieme,
      vittorie_insieme: rivalry.vittorie_insieme,
      sconfitte_insieme: rivalry.sconfitte_insieme,
      partite_contro: rivalry.partite_contro,
      vittorie_g1: isReversed ? rivalry.vittorie_g2 : rivalry.vittorie_g1,
      vittorie_g2: isReversed ? rivalry.vittorie_g1 : rivalry.vittorie_g2,
      totale_partite: rivalry.totale_partite,
    };
  }

  return jsonResponse({
    player1: p1,
    player2: p2,
    tag,
    // Prefer computed stats; fall back to stored rivalry if available
    stats: {
      partite_insieme: partiteInsieme || storedStats?.partite_insieme || 0,
      vittorie_insieme: vittorieInsieme || storedStats?.vittorie_insieme || 0,
      sconfitte_insieme: sconfitteInsieme || storedStats?.sconfitte_insieme || 0,
      partite_contro: partiteContro || storedStats?.partite_contro || 0,
      vittorie_g1: vittorieP1 || storedStats?.vittorie_g1 || 0,
      vittorie_g2: vittorieP2 || storedStats?.vittorie_g2 || 0,
      totale_partite: totalePartite || storedStats?.totale_partite || 0,
    },
  });
});
