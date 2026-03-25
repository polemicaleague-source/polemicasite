import { z } from 'zod'

// --- API response schemas (Zod validation at system boundary) ---

export const classificaRowSchema = z.object({
  id: z.string(),
  nome: z.string(),
  presenze: z.number(),
  gol_totali: z.number(),
  assist_totali: z.number(),
  media_voto: z.number().nullable(),
  gcp: z.number().nullable(),
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
  er: z.number().nullable(),
  tratto: z.string().nullable(),
  tenore_fisico: z.string().nullable(),
  base_rating: z.number().nullable(),
  last_er: z.number().nullable(),
  delta_rating: z.number().nullable(),
  player_roles: z.array(playerRoleSchema).optional(),
})

export const playerTrendResponseSchema = z.object({
  player: playerSchema,
  stats: z.object({
    presenze: z.number(),
    gol_totali: z.number(),
    assist_totali: z.number(),
    media_voto: z.number().nullable(),
    gcp: z.number().nullable(),
    plus_minus: z.number(),
  }),
  streak: z.array(z.string()),
  trend: z.array(playerTrendRowSchema),
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
