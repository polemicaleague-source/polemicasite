import { supabase } from '../lib/supabase'
import type { PlayerTrendResponse } from '../lib/schemas'

export async function getPlayerTrend(id: string): Promise<PlayerTrendResponse> {
  // Fetch player info + match details + max giornata in parallel
  const [playerResult, matchResult, maxGiornataResult] = await Promise.all([
    supabase
      .from('players')
      .select('id, nome, soprannome, avatar_url, er, tratto, tenore_fisico, base_rating, expected_rating, last_er, delta_rating, player_roles(ruolo, ordine)')
      .eq('id', id)
      .single(),
    supabase
      .from('match_details')
      .select('player_id, giornata, data, er, voto, gol, autogol, assist, risultato, differenza_reti, squadra')
      .eq('player_id', id)
      .order('giornata', { ascending: true }),
    supabase
      .from('match_details')
      .select('giornata')
      .order('giornata', { ascending: false })
      .limit(1)
      .single(),
  ])

  const { data: player, error: playerError } = playerResult
  if (playerError || !player) throw new Error(playerError?.message ?? 'Giocatore non trovato')

  const { data: matchRows, error: matchError } = matchResult
  if (matchError) throw new Error(matchError.message)

  const trendRows = (matchRows ?? []) as Array<{
    player_id: string; giornata: number; data: string;
    er: number | null; voto: number | null; gol: number;
    autogol: number; assist: number; risultato: string;
    differenza_reti: number; squadra: string;
  }>

  // Basic aggregates
  const presenze = trendRows.length
  const gol_totali = trendRows.reduce((s, r) => s + r.gol, 0)
  const assist_totali = trendRows.reduce((s, r) => s + r.assist, 0)
  const autogol = trendRows.reduce((s, r) => s + r.autogol, 0)
  const plus_minus = trendRows.reduce((s, r) => s + r.differenza_reti, 0)
  const vittorie = trendRows.filter((r) => r.risultato === 'V').length
  const sconfitte = trendRows.filter((r) => r.risultato === 'S').length
  const pareggi = trendRows.filter((r) => r.risultato === 'P').length

  // Averages
  const votiValidi = trendRows.filter((r) => r.voto !== null)
  const media_voto = votiValidi.length > 0
    ? Math.round((votiValidi.reduce((s, r) => s + r.voto!, 0) / votiValidi.length) * 100) / 100
    : null
  const media_gol = presenze > 0 ? Math.round((gol_totali / presenze) * 100) / 100 : null
  const media_assist = presenze > 0 ? Math.round((assist_totali / presenze) * 100) / 100 : null
  const ratio_vittorie = presenze > 0 ? Math.round((vittorie / presenze) * 100) / 100 : null

  // Media On Fire (ultime 3 partite)
  const last3Voti = trendRows.slice(-3).filter((r) => r.voto !== null)
  const media_on_fire = last3Voti.length > 0
    ? Math.round((last3Voti.reduce((s, r) => s + r.voto!, 0) / last3Voti.length) * 100) / 100
    : null

  // --- Streak calculations (current, from end) ---

  // Win/loss streak (alternative: one interrupts the other)
  let streak_vittorie = 0
  let streak_sconfitte = 0
  for (let i = trendRows.length - 1; i >= 0; i--) {
    const r = trendRows[i].risultato
    if (i === trendRows.length - 1) {
      if (r === 'V') streak_vittorie = 1
      else if (r === 'S') streak_sconfitte = 1
      else break // draw breaks both
    } else {
      if (streak_vittorie > 0 && r === 'V') streak_vittorie++
      else if (streak_sconfitte > 0 && r === 'S') streak_sconfitte++
      else break
    }
  }

  // Goal streak (consecutive matches with at least 1 goal)
  let streak_gol = 0
  for (let i = trendRows.length - 1; i >= 0; i--) {
    if (trendRows[i].gol > 0) streak_gol++
    else break
  }

  // Assist streak
  let streak_assist = 0
  for (let i = trendRows.length - 1; i >= 0; i--) {
    if (trendRows[i].assist > 0) streak_assist++
    else break
  }

  // Presence/absence streak - need to know total giornate
  const giornateGiocate = new Set(trendRows.map((r) => r.giornata))

  const maxGiornata = maxGiornataResult.data?.giornata ?? 0
  const assenze = maxGiornata - presenze

  // Presence/absence streak from end (alternative)
  let streak_presenze = 0
  let streak_assenze = 0
  for (let g = maxGiornata; g >= 1; g--) {
    if (g === maxGiornata) {
      if (giornateGiocate.has(g)) streak_presenze = 1
      else streak_assenze = 1
    } else {
      if (streak_presenze > 0 && giornateGiocate.has(g)) streak_presenze++
      else if (streak_assenze > 0 && !giornateGiocate.has(g)) streak_assenze++
      else break
    }
  }

  // Last 5 matches results
  const streak = trendRows.slice(-5).map((r) => r.risultato)

  // --- Top 3 compagni & avversari ---
  // Fetch all match details for giornate this player participated in
  const giornateArr = Array.from(giornateGiocate)
  const { data: allMatches } = await supabase
    .from('match_details')
    .select('player_id, giornata, squadra, risultato')
    .in('giornata', giornateArr)
    .neq('player_id', id)

  // Build a map of this player's team per giornata
  const playerTeamMap = new Map(trendRows.map((r) => [r.giornata, { squadra: r.squadra, risultato: r.risultato }]))

  // Aggregate per other player
  const compagniMap = new Map<string, { partite: number; vittorie: number; sconfitte: number }>()
  const avversariMap = new Map<string, { partite: number; vittorie: number; sconfitte: number }>()

  for (const m of allMatches ?? []) {
    const myMatch = playerTeamMap.get(m.giornata)
    if (!myMatch) continue

    if (m.squadra === myMatch.squadra) {
      // Teammate
      const prev = compagniMap.get(m.player_id) ?? { partite: 0, vittorie: 0, sconfitte: 0 }
      prev.partite++
      if (myMatch.risultato === 'V') prev.vittorie++
      if (myMatch.risultato === 'S') prev.sconfitte++
      compagniMap.set(m.player_id, prev)
    } else {
      // Opponent
      const prev = avversariMap.get(m.player_id) ?? { partite: 0, vittorie: 0, sconfitte: 0 }
      prev.partite++
      if (myMatch.risultato === 'V') prev.vittorie++
      if (m.risultato === 'V') prev.sconfitte++ // opponent's wins = my losses
      avversariMap.set(m.player_id, prev)
    }
  }

  // Get top 3 by partite count
  const topCompagniIds = [...compagniMap.entries()]
    .sort((a, b) => b[1].partite - a[1].partite)
    .slice(0, 3)

  const topAvversariIds = [...avversariMap.entries()]
    .sort((a, b) => b[1].partite - a[1].partite)
    .slice(0, 3)

  // Fetch names for top players
  const allTopIds = [...topCompagniIds.map(([id]) => id), ...topAvversariIds.map(([id]) => id)]
  const { data: topPlayers } = allTopIds.length > 0
    ? await supabase.from('players').select('id, nome').in('id', allTopIds)
    : { data: [] }

  const nameMap = new Map((topPlayers ?? []).map((p) => [p.id, p.nome]))

  const top_compagni = topCompagniIds.map(([pid, stats]) => ({
    id: pid,
    nome: nameMap.get(pid) ?? 'ND',
    partite: stats.partite,
    vittorie: stats.vittorie,
    sconfitte: stats.sconfitte,
  }))

  const top_avversari = topAvversariIds.map(([pid, stats]) => ({
    id: pid,
    nome: nameMap.get(pid) ?? 'ND',
    partite: stats.partite,
    vittorie: stats.vittorie,
    sconfitte: stats.sconfitte,
  }))

  // Ratings (expected_rating is persisted in DB, recalculated via recalc_expected_rating RPC)
  const base_rating = player.base_rating ?? null
  const expected_rating = player.expected_rating ?? null
  const delta_rating = base_rating !== null && expected_rating !== null
    ? Math.round((base_rating - expected_rating) * 100) / 100
    : null

  // Build trend data (same fields as view for chart compatibility)
  const trend = trendRows.map((r) => ({
    player_id: r.player_id,
    giornata: r.giornata,
    data: r.data,
    er: r.er,
    voto: r.voto,
    gol: r.gol,
    assist: r.assist,
    risultato: r.risultato,
    differenza_reti: r.differenza_reti,
  }))

  return {
    player: player as any,
    stats: {
      presenze,
      assenze,
      streak_presenze,
      streak_assenze,
      gol_totali,
      media_gol,
      assist_totali,
      media_assist,
      autogol,
      streak_gol,
      streak_assist,
      vittorie,
      sconfitte,
      pareggi,
      ratio_vittorie,
      streak_vittorie,
      streak_sconfitte,
      media_voto,
      media_on_fire,
      base_rating,
      expected_rating,
      delta_rating,
      plus_minus,
    },
    streak,
    trend,
    top_compagni,
    top_avversari,
  }
}
