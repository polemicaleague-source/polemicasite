import { supabase } from '../lib/supabase'
import type { PlayerTrendResponse } from '../lib/schemas'

export async function getPlayerTrend(id: string): Promise<PlayerTrendResponse> {
  // Fetch player info + roles
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, nome, er, tratto, tenore_fisico, base_rating, last_er, delta_rating, player_roles(ruolo, ordine)')
    .eq('id', id)
    .single()

  if (playerError || !player) throw new Error(playerError?.message ?? 'Giocatore non trovato')

  // Fetch trend from view
  const { data: trend, error: trendError } = await supabase
    .from('v_player_trend')
    .select('*')
    .eq('player_id', id)
    .order('giornata', { ascending: true })

  if (trendError) throw new Error(trendError.message)

  const trendRows = (trend ?? []) as Array<{
    player_id: string; giornata: number; data: string;
    er: number | null; voto: number | null; gol: number;
    assist: number; risultato: string; differenza_reti: number;
  }>

  // Compute aggregates
  const presenze = trendRows.length
  const gol_totali = trendRows.reduce((s, r) => s + r.gol, 0)
  const assist_totali = trendRows.reduce((s, r) => s + r.assist, 0)
  const plus_minus = trendRows.reduce((s, r) => s + r.differenza_reti, 0)
  const votiValidi = trendRows.filter((r) => r.voto !== null)
  const media_voto = votiValidi.length > 0
    ? Math.round((votiValidi.reduce((s, r) => s + r.voto!, 0) / votiValidi.length) * 100) / 100
    : null

  const erSum = trendRows.reduce((s, r) => s + (r.er !== null && r.er > 0 ? r.er : 0), 0)
  const gcp = erSum > 0
    ? Math.round(((gol_totali + assist_totali) / erSum) * 1000) / 1000
    : null

  const streak = trendRows.slice(-5).map((r) => r.risultato)

  return {
    player: player as any,
    stats: { presenze, gol_totali, assist_totali, media_voto, gcp, plus_minus },
    streak,
    trend: trendRows,
  }
}
