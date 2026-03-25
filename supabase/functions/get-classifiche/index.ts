import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import type { ClassificaRow, ClassificaType } from "../_shared/types.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "gcp") as ClassificaType;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  if (!["gcp", "voto", "marcatori"].includes(type)) {
    return jsonResponse({ error: "type must be gcp | voto | marcatori" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Query v_gcp view (always has all aggregated data)
  const { data: rows, error } = await supabase
    .from("v_gcp")
    .select("*");

  if (error) return jsonResponse({ error: error.message }, 500);

  const typed = (rows ?? []) as ClassificaRow[];

  // Sort by requested metric (NULLs last)
  const sortKey = type === "marcatori" ? "gol_totali" : type === "voto" ? "media_voto" : "gcp";
  typed.sort((a, b) => {
    const va = a[sortKey as keyof ClassificaRow] as number | null;
    const vb = b[sortKey as keyof ClassificaRow] as number | null;
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return vb - va;
  });

  // Compute streak for each player
  const playerIds = typed.map((r) => r.id);

  // Fetch last 5 matches per player for streak
  const { data: matchRows } = await supabase
    .from("match_details")
    .select("player_id, giornata, risultato")
    .in("player_id", playerIds)
    .order("giornata", { ascending: false });

  const streakMap = new Map<string, string[]>();
  for (const m of matchRows ?? []) {
    const arr = streakMap.get(m.player_id) ?? [];
    if (arr.length < 5) arr.push(m.risultato);
    streakMap.set(m.player_id, arr);
  }

  // Compute consecutive streak from most recent
  function computeStreak(results: string[]): string | null {
    if (!results || results.length === 0) return null;
    const first = results[0];
    let count = 0;
    for (const r of results) {
      if (r === first) count++;
      else break;
    }
    return `${count}${first}`;
  }

  // Build response with streak and pagination
  const paginated = typed.slice(offset, offset + limit);
  const response = paginated.map((r) => ({
    ...r,
    streak: computeStreak(streakMap.get(r.id) ?? []),
    last_5: streakMap.get(r.id) ?? [],
  }));

  return jsonResponse({
    data: response,
    page,
    limit,
    total: typed.length,
  });
});
