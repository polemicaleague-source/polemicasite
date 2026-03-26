import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ---------------------------------------------------------------------------
// CSV Parser — handles quoted fields, multiline values, configurable separator
// ---------------------------------------------------------------------------
function parseCsv(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === separator) {
        row.push(current);
        current = "";
      } else if (ch === "\r") {
        // skip \r
      } else if (ch === "\n") {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }
  // last field / row
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toFloat(val: string | undefined): number | null {
  if (val === undefined || val === null || val.trim() === "") return null;
  // Handle Italian comma decimal: "7,5" → "7.5"
  const cleaned = val.trim().replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function toInt(val: string | undefined): number | null {
  if (val === undefined || val === null || val.trim() === "") return null;
  const n = parseInt(val.trim(), 10);
  return isNaN(n) ? null : n;
}

function toDate(val: string): string | null {
  if (!val || !val.trim()) return null;
  const t = val.trim();
  // DD/MM/YYYY → YYYY-MM-DD
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

// ---------------------------------------------------------------------------
// Zod schemas (match SQL from Step 1)
// ---------------------------------------------------------------------------
const matchDetailSchema = z.object({
  data: z.string().min(1),
  giornata: z.number().int().positive(),
  campo: z.string().nullable(),
  ora: z.string().nullable(),
  squadra: z.enum(["A", "B"]),
  giocatore: z.string().min(1),
  er: z.number().nullable(),
  gol: z.number().int(),
  autogol: z.number().int(),
  assist: z.number().int(),
  voto: z.number().nullable(),
  gol_squadra: z.number().int(),
  gol_avversari: z.number().int(),
  risultato: z.enum(["V", "P", "S"]),
  differenza_reti: z.number().int(),
});

const playerSchema = z.object({
  nome: z.string().min(1),
  er: z.number().nullable(),
  ruoli: z.array(z.string()).max(4),
  tratto: z.string().nullable(),
  tenore_fisico: z.string().nullable(),
  base_rating: z.number().nullable(),
  last_er: z.number().nullable(),
  delta_rating: z.number().nullable(),
  er_history: z.array(
    z.object({ giornata: z.number().int().positive(), er: z.number() })
  ),
});

const rivalrySchema = z.object({
  tag: z.string().nullable(),
  giocatore1: z.string().min(1),
  giocatore2: z.string().min(1),
  partite_insieme: z.number().int(),
  vittorie_insieme: z.number().int(),
  sconfitte_insieme: z.number().int(),
  partite_contro: z.number().int(),
  vittorie_g1: z.number().int(),
  vittorie_g2: z.number().int(),
  totale_partite: z.number().int(),
});

const newsSchema = z.object({
  giornata: z.number().int().positive(),
  data: z.string().nullable(),
  posizione: z.number().int().nullable(),
  titolo: z.string().min(1),
  corpo: z.string().nullable(),
});

const manifestoSchema = z.object({
  articolo: z.string().min(1),
  nome_articolo: z.string().min(1),
  corpo: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Sheet processors
// ---------------------------------------------------------------------------
type ImportResult = { inserted: number; skipped: number; errors: { row: number; reason: string }[] };

async function importDettaglio(
  rows: string[][],
  supabase: ReturnType<typeof createClient>
): Promise<ImportResult> {
  // Row 0: empty, Row 1: header, Data from Row 2+
  const header = rows[1];
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

  // Resolve player names → IDs
  const { data: players } = await supabase.from("players").select("id, nome");
  const playerMap = new Map<string, string>();
  for (const p of players ?? []) playerMap.set(p.nome.toLowerCase(), p.id);

  const toInsert: Record<string, unknown>[] = [];

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r[5] || !r[5].trim()) { result.skipped++; continue; } // no player name

    try {
      const parsed = matchDetailSchema.parse({
        data: toDate(r[0])!,
        giornata: toInt(r[1])!,
        campo: r[2]?.trim() || null,
        ora: r[3]?.trim() || null,
        squadra: r[4]?.trim(),
        giocatore: r[5]?.trim(),
        er: toFloat(r[6]),
        gol: toInt(r[7]) ?? 0,
        autogol: toInt(r[8]) ?? 0,
        assist: toInt(r[9]) ?? 0,
        // Skip GCP at index 10
        voto: toFloat(r[11]),
        gol_squadra: toInt(r[12]) ?? 0,
        gol_avversari: toInt(r[13]) ?? 0,
        risultato: r[14]?.trim(),
        differenza_reti: toInt(r[15]) ?? 0,
      });

      const playerId = playerMap.get(parsed.giocatore.toLowerCase());
      if (!playerId) {
        result.errors.push({ row: i + 1, reason: `Player not found: ${parsed.giocatore}` });
        result.skipped++;
        continue;
      }

      toInsert.push({
        data: parsed.data,
        giornata: parsed.giornata,
        campo: parsed.campo,
        ora: parsed.ora,
        squadra: parsed.squadra,
        player_id: playerId,
        er: parsed.er,
        gol: parsed.gol,
        autogol: parsed.autogol,
        assist: parsed.assist,
        voto: parsed.voto,
        gol_squadra: parsed.gol_squadra,
        gol_avversari: parsed.gol_avversari,
        risultato: parsed.risultato,
        differenza_reti: parsed.differenza_reti,
      });
    } catch (e) {
      result.errors.push({ row: i + 1, reason: String(e) });
      result.skipped++;
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("match_details").insert(toInsert);
    if (error) {
      result.errors.push({ row: 0, reason: `DB insert: ${error.message}` });
    } else {
      result.inserted = toInsert.length;
      // Recalculate expected_rating for affected players
      const playerIds = [...new Set(toInsert.map((r) => r.player_id as string))];
      await supabase.rpc("recalc_expected_rating", { p_ids: playerIds });
    }
  }
  return result;
}

async function importRating(
  rows: string[][],
  supabase: ReturnType<typeof createClient>
): Promise<ImportResult> {
  // Row 0-1: meta, Row 2: header, Data from Row 3+
  // Columns: Giocatore, ER(2cols), Ruolo1, Ruolo2, Ruolo3, Ruolo4,
  //   Tratto, Tenore, BaseRating(2cols), LastER(2cols), Delta(2cols),
  //   ER1(2cols)..ER32(2cols), n
  //
  // Rating CSV has merged cells: numeric values span 2 columns (int part, decimal part).
  // e.g. "5,3" in the file → columns [1]="5", [2]="3" → 5.3
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

  function mergeDecimal(intPart: string | undefined, decPart: string | undefined): number | null {
    const i = intPart?.trim();
    const d = decPart?.trim();
    if (!i && !d) return null;
    if (i && d) {
      const n = parseFloat(`${i}.${d}`);
      return isNaN(n) ? null : n;
    }
    if (i) { const n = parseFloat(i); return isNaN(n) ? null : n; }
    return null;
  }

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    const nome = r[0]?.trim();
    if (!nome) { result.skipped++; continue; }

    try {
      // Columns with 2-col decimal: ER=[1,2], BaseRating=[8,9], LastER=[10,11], Delta=[12,13]
      // Roles: [3],[4],[5],[6]  Tratto:[7]  Tenore: skip (no col in this layout)
      // Actually from the header: Giocatore(0), ER(1,2), Ruolo1(3), Ruolo2(4), Ruolo3(5), Ruolo4(6),
      //   Tratto(7), Tenore(8??)...
      // Wait, let me re-examine. The header row 2 says: ,2,3,4,5,6,7,8,9,10,11,...
      // And header row 3: Giocatore,ER,Ruolo 1,Ruolo 2,Ruolo 3,Ruolo 4,Tratto,Tenore,Base Rating,Last ER,Delta,ER1,...
      // But ER takes 2 physical columns. So physical layout:
      // [0]=Giocatore, [1,2]=ER, [3]=Ruolo1, [4]=Ruolo2, [5]=Ruolo3, [6]=Ruolo4,
      // [7]=Tratto, [8]=Tenore, [9,10]=BaseRating, [11,12]=LastER, [13,14]=Delta,
      // [15,16]=ER1, [17,18]=ER2, ..., [15+2*(n-1), 16+2*(n-1)]=ERn
      // Actually: let me count from the data row for Alberto:
      // Alberto Scarafile,5,3,CC,TD,TS,ATT,Gregario,,6,6,6,5,-1,3,...
      // [0]=Alberto [1]=5 [2]=3 [3]=CC [4]=TD [5]=TS [6]=ATT [7]=Gregario [8]=<empty>
      // [9]=6 [10]=6 [11]=6 [12]=5 [13]=-1 [14]=3
      // So ER=5.3, Ruoli=CC,TD,TS,ATT, Tratto=Gregario, Tenore=<empty>,
      // BaseRating=6.6, LastER=6.5, Delta=-1.3
      // Then ER1=[15,16], ER2=[17,18], ...

      const er = mergeDecimal(r[1], r[2]);
      const ruoli: string[] = [];
      for (const idx of [3, 4, 5, 6]) {
        const v = r[idx]?.trim();
        if (v) ruoli.push(v);
      }
      const tratto = r[7]?.trim() || null;
      const tenore = r[8]?.trim() || null;
      const baseRating = mergeDecimal(r[9], r[10]);
      const lastEr = mergeDecimal(r[11], r[12]);
      const deltaRating = mergeDecimal(r[13], r[14]);

      // ER history: ER1 at [15,16], ER2 at [17,18], ..., ER32 at [15+62, 16+62]=[77,78]
      const erHistory: { giornata: number; er: number }[] = [];
      for (let g = 1; g <= 32; g++) {
        const baseIdx = 15 + (g - 1) * 2;
        const erVal = mergeDecimal(r[baseIdx], r[baseIdx + 1]);
        if (erVal !== null) {
          erHistory.push({ giornata: g, er: erVal });
        }
      }

      const parsed = playerSchema.parse({
        nome,
        er,
        ruoli,
        tratto,
        tenore_fisico: tenore,
        base_rating: baseRating,
        last_er: lastEr,
        delta_rating: deltaRating,
        er_history: erHistory,
      });

      // Upsert player
      const { data: player, error: playerErr } = await supabase
        .from("players")
        .upsert({ nome: parsed.nome, er: parsed.er, tratto: parsed.tratto, tenore_fisico: parsed.tenore_fisico, base_rating: parsed.base_rating, last_er: parsed.last_er, delta_rating: parsed.delta_rating }, { onConflict: "nome" })
        .select("id")
        .single();

      if (playerErr || !player) {
        result.errors.push({ row: i + 1, reason: `Player upsert: ${playerErr?.message}` });
        result.skipped++;
        continue;
      }

      // Insert roles (delete old first)
      await supabase.from("player_roles").delete().eq("player_id", player.id);
      if (parsed.ruoli.length > 0) {
        const roleRows = parsed.ruoli.map((ruolo, idx) => ({
          player_id: player.id,
          ruolo,
          ordine: idx + 1,
        }));
        await supabase.from("player_roles").insert(roleRows);
      }

      // Insert ER history (delete old first)
      await supabase.from("player_er_history").delete().eq("player_id", player.id);
      if (parsed.er_history.length > 0) {
        const erRows = parsed.er_history.map((eh) => ({
          player_id: player.id,
          giornata: eh.giornata,
          er: eh.er,
        }));
        await supabase.from("player_er_history").insert(erRows);
      }

      result.inserted++;
    } catch (e) {
      result.errors.push({ row: i + 1, reason: String(e) });
      result.skipped++;
    }
  }

  // Recalculate expected_rating for all players (base_rating may have changed)
  if (result.inserted > 0) {
    await supabase.rpc("recalc_expected_rating", { p_ids: [] });
  }

  return result;
}

async function import1vs1(
  rows: string[][],
  supabase: ReturnType<typeof createClient>
): Promise<ImportResult> {
  // Row 0-1: meta, Row 2: header, Data from Row 3+
  // Columns: [0]=tag (or empty), [1]=Giocatore1, [2]=Giocatore2,
  //   [3]=Partite insieme, [4]=Vittorie, [5]=Sconfitte,
  //   [6]=Partite contro, [7]=Vittoria1, [8]=Vittoria2, [9]=empty, [10]=Totale
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

  const { data: players } = await supabase.from("players").select("id, nome");
  const playerMap = new Map<string, string>();
  for (const p of players ?? []) playerMap.set(p.nome.toLowerCase(), p.id);

  const toInsert: Record<string, unknown>[] = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    const g1 = r[1]?.trim();
    const g2 = r[2]?.trim();
    if (!g1 || !g2) { result.skipped++; continue; }

    try {
      const tag = r[0]?.trim() || null;
      const parsed = rivalrySchema.parse({
        tag: tag && ["LA SFIDA MAESTRA", "DERBY D'ITALIA"].includes(tag) ? tag : null,
        giocatore1: g1,
        giocatore2: g2,
        partite_insieme: toInt(r[3]) ?? 0,
        vittorie_insieme: toInt(r[4]) ?? 0,
        sconfitte_insieme: toInt(r[5]) ?? 0,
        partite_contro: toInt(r[6]) ?? 0,
        vittorie_g1: toInt(r[7]) ?? 0,
        vittorie_g2: toInt(r[8]) ?? 0,
        totale_partite: toInt(r[10]) ?? 0,
      });

      const p1Id = playerMap.get(parsed.giocatore1.toLowerCase());
      const p2Id = playerMap.get(parsed.giocatore2.toLowerCase());
      if (!p1Id) { result.errors.push({ row: i + 1, reason: `Player not found: ${parsed.giocatore1}` }); result.skipped++; continue; }
      if (!p2Id) { result.errors.push({ row: i + 1, reason: `Player not found: ${parsed.giocatore2}` }); result.skipped++; continue; }

      toInsert.push({
        player1_id: p1Id,
        player2_id: p2Id,
        tag: parsed.tag,
        partite_insieme: parsed.partite_insieme,
        vittorie_insieme: parsed.vittorie_insieme,
        sconfitte_insieme: parsed.sconfitte_insieme,
        partite_contro: parsed.partite_contro,
        vittorie_g1: parsed.vittorie_g1,
        vittorie_g2: parsed.vittorie_g2,
        totale_partite: parsed.totale_partite,
      });
    } catch (e) {
      result.errors.push({ row: i + 1, reason: String(e) });
      result.skipped++;
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("rivalries").insert(toInsert);
    if (error) {
      result.errors.push({ row: 0, reason: `DB insert: ${error.message}` });
    } else {
      result.inserted = toInsert.length;
    }
  }
  return result;
}

async function importNews(
  rows: string[][],
  supabase: ReturnType<typeof createClient>
): Promise<ImportResult> {
  // Row 0: empty, Row 1: header (, giornata, data, pos, titolo, corpo)
  // Data from Row 2+. First column (index 0) is empty.
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };
  const toInsert: Record<string, unknown>[] = [];

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const titolo = r[4]?.trim();
    if (!titolo) { result.skipped++; continue; }

    try {
      const parsed = newsSchema.parse({
        giornata: toInt(r[1])!,
        data: toDate(r[2]),
        posizione: toInt(r[3]),
        titolo,
        corpo: r[5]?.trim() || null,
      });

      toInsert.push({
        giornata: parsed.giornata,
        data: parsed.data,
        posizione: parsed.posizione,
        titolo: parsed.titolo,
        corpo: parsed.corpo,
      });
    } catch (e) {
      result.errors.push({ row: i + 1, reason: String(e) });
      result.skipped++;
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("news").insert(toInsert);
    if (error) {
      result.errors.push({ row: 0, reason: `DB insert: ${error.message}` });
    } else {
      result.inserted = toInsert.length;
    }
  }
  return result;
}

async function importManifesto(
  rows: string[][],
  supabase: ReturnType<typeof createClient>
): Promise<ImportResult> {
  // Row 0-1: meta, Row 2: header (art., nome articolo, corpo)
  // Data from Row 3+. Skip empty rows.
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };
  const toInsert: Record<string, unknown>[] = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    const articolo = r[0]?.trim();
    const nomeArticolo = r[1]?.trim();
    if (!articolo || !nomeArticolo) { result.skipped++; continue; }

    try {
      const parsed = manifestoSchema.parse({
        articolo,
        nome_articolo: nomeArticolo,
        corpo: r[2]?.trim() || null,
      });

      toInsert.push({
        articolo: parsed.articolo,
        nome_articolo: parsed.nome_articolo,
        corpo: parsed.corpo,
      });
    } catch (e) {
      result.errors.push({ row: i + 1, reason: String(e) });
      result.skipped++;
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("manifesto").insert(toInsert);
    if (error) {
      result.errors.push({ row: 0, reason: `DB insert: ${error.message}` });
    } else {
      result.inserted = toInsert.length;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Separator detection per sheet
// ---------------------------------------------------------------------------
function getSeparator(sheet: string): string {
  return sheet === "manifesto" ? ";" : ",";
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
const VALID_SHEETS = ["dettaglio", "rating", "1vs1", "news", "manifesto"] as const;
type Sheet = (typeof VALID_SHEETS)[number];

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // --- Auth check: must be admin ---
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return jsonResponse({ error: "Missing authorization token" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify JWT and check admin role
  const supabaseAuth = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: "Invalid token" }, 401);
  if (user.user_metadata?.role !== "admin") return jsonResponse({ error: "Forbidden: admin only" }, 403);

  // --- Parse multipart form data ---
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonResponse({ error: "Invalid multipart/form-data" }, 400);
  }

  const sheet = formData.get("sheet") as string | null;
  const file = formData.get("file") as File | null;

  if (!sheet || !VALID_SHEETS.includes(sheet as Sheet)) {
    return jsonResponse({ error: `Invalid sheet. Must be one of: ${VALID_SHEETS.join(", ")}` }, 400);
  }
  if (!file) {
    return jsonResponse({ error: "Missing file" }, 400);
  }

  // --- Read and parse CSV ---
  const text = await file.text();
  const separator = getSeparator(sheet);
  const rows = parseCsv(text, separator);

  if (rows.length < 2) {
    return jsonResponse({ error: "CSV has too few rows" }, 400);
  }

  // Use service role client for DB writes (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // --- Dispatch to sheet handler ---
  let result: ImportResult;
  switch (sheet as Sheet) {
    case "dettaglio":
      result = await importDettaglio(rows, supabase);
      break;
    case "rating":
      result = await importRating(rows, supabase);
      break;
    case "1vs1":
      result = await import1vs1(rows, supabase);
      break;
    case "news":
      result = await importNews(rows, supabase);
      break;
    case "manifesto":
      result = await importManifesto(rows, supabase);
      break;
    default:
      return jsonResponse({ error: "Unknown sheet" }, 400);
  }

  return jsonResponse(result, 200);
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
