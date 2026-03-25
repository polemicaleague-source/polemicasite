import { z } from 'zod'

// --- API response schemas (Zod validation at system boundary) ---

export const classificaRowSchema = z.object({
  id: z.string(),
  nome: z.string(),
  presenze: z.number(),
  gol_totali: z.number(),
  assist_totali: z.number(),
  media_voto: z.number().nullable(),
  plus_minus: z.number(),
  streak: z.string().nullable(),
  last_5: z.array(z.string()),
})

export const classificheResponseSchema = z.object({
  data: z.array(classificaRowSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
})

export const playerTrendRowSchema = z.object({
  player_id: z.string(),
  giornata: z.number(),
  data: z.string(),
  er: z.number().nullable(),
  voto: z.number().nullable(),
  gol: z.number(),
  assist: z.number(),
  risultato: z.string(),
  differenza_reti: z.number(),
})

export const playerRoleSchema = z.object({
  ruolo: z.string(),
  ordine: z.number(),
})

export const playerSchema = z.object({
  id: z.string(),
  nome: z.string(),
  soprannome: z.string().nullable(),
  avatar_url: z.string().nullable(),
  er: z.number().nullable(),
  tratto: z.string().nullable(),
  tenore_fisico: z.string().nullable(),
  base_rating: z.number().nullable(),
  last_er: z.number().nullable(),
  delta_rating: z.number().nullable(),
  player_roles: z.array(playerRoleSchema).optional(),
})

export const topPlayerSchema = z.object({
  id: z.string(),
  nome: z.string(),
  partite: z.number(),
  vittorie: z.number(),
  sconfitte: z.number(),
})

export const playerTrendResponseSchema = z.object({
  player: playerSchema,
  stats: z.object({
    presenze: z.number(),
    assenze: z.number(),
    streak_presenze: z.number(),
    streak_assenze: z.number(),
    gol_totali: z.number(),
    media_gol: z.number().nullable(),
    assist_totali: z.number(),
    media_assist: z.number().nullable(),
    autogol: z.number(),
    streak_gol: z.number(),
    streak_assist: z.number(),
    vittorie: z.number(),
    sconfitte: z.number(),
    pareggi: z.number(),
    ratio_vittorie: z.number().nullable(),
    streak_vittorie: z.number(),
    streak_sconfitte: z.number(),
    media_voto: z.number().nullable(),
    media_on_fire: z.number().nullable(),
    base_rating: z.number().nullable(),
    expected_rating: z.number().nullable(),
    delta_rating: z.number().nullable(),
    plus_minus: z.number(),
  }),
  streak: z.array(z.string()),
  trend: z.array(playerTrendRowSchema),
  top_compagni: z.array(topPlayerSchema),
  top_avversari: z.array(topPlayerSchema),
})

export const oneVsOneResponseSchema = z.object({
  player1: z.object({ id: z.string(), nome: z.string() }),
  player2: z.object({ id: z.string(), nome: z.string() }),
  tag: z.string().nullable(),
  stats: z.object({
    partite_insieme: z.number(),
    vittorie_insieme: z.number(),
    sconfitte_insieme: z.number(),
    partite_contro: z.number(),
    vittorie_g1: z.number(),
    vittorie_g2: z.number(),
    totale_partite: z.number(),
  }),
})

export const importResultSchema = z.object({
  inserted: z.number(),
  skipped: z.number(),
  errors: z.array(z.object({ row: z.number(), reason: z.string() })),
})

// Inferred types from schemas
export type ClassificaRow = z.infer<typeof classificaRowSchema>
export type ClassificheResponse = z.infer<typeof classificheResponseSchema>
export type PlayerTrendResponse = z.infer<typeof playerTrendResponseSchema>
export type OneVsOneResponse = z.infer<typeof oneVsOneResponseSchema>
export type ImportResult = z.infer<typeof importResultSchema>
export type Player = z.infer<typeof playerSchema>
export type TopPlayer = z.infer<typeof topPlayerSchema>
