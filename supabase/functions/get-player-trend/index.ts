import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import type { PlayerTrendRow } from "../_shared/types.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return jsonResponse({ error: "Missing id parameter" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get trend data from view
  const { data: trend, error: trendError } = await supabase
    .from("v_player_trend")
    .select("*")
    .eq("player_id", playerId)
    .order("giornata", { ascending: true });

  if (trendError) return jsonResponse({ error: trendError.message }, 500);

  // Get player info
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, nome, er, tratto, tenore_fisico, base_rating, last_er, delta_rating, player_roles(ruolo, ordine)")
    .eq("id", playerId)
    .single();

  if (playerError) return jsonResponse({ error: playerError.message }, 404);

  const trendRows = (trend ?? []) as PlayerTrendRow[];

  // Compute aggregates
  const presenze = trendRows.length;
  const golTotali = trendRows.reduce((s, r) => s + r.gol, 0);
  const assistTotali = trendRows.reduce((s, r) => s + r.assist, 0);
  const plusMinus = trendRows.reduce((s, r) => s + r.differenza_reti, 0);
  const votiValidi = trendRows.filter((r) => r.voto !== null);
  const mediaVoto = votiValidi.length > 0
    ? Math.round((votiValidi.reduce((s, r) => s + r.voto!, 0) / votiValidi.length) * 100) / 100
    : null;

  // GCP: (gol + assist) / sum(er where er > 0)
  const erSum = trendRows.reduce((s, r) => s + (r.er !== null && r.er > 0 ? r.er : 0), 0);
  const gcp = erSum > 0
    ? Math.round(((golTotali + assistTotali) / erSum) * 1000) / 1000
    : null;

  // Streak: last 5 results
  const last5 = trendRows.slice(-5).map((r) => r.risultato);

  return jsonResponse({
    player,
    stats: { presenze, gol_totali: golTotali, assist_totali: assistTotali, media_voto: mediaVoto, gcp, plus_minus: plusMinus },
    streak: last5,
    trend: trendRows,
  });
});
