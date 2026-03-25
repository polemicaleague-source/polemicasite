import { supabase } from '../lib/supabase'
import type { OneVsOneResponse } from '../lib/schemas'

export async function get1vs1(id1: string, id2: string): Promise<OneVsOneResponse> {
  // Get player names
  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id, nome')
    .in('id', [id1, id2])

  if (pErr || !players || players.length < 2) throw new Error('Giocatori non trovati')

  const p1 = players.find((p) => p.id === id1)!
  const p2 = players.find((p) => p.id === id2)!

  // Check stored rivalry for tag
  const { data: rivalry } = await supabase
    .from('rivalries')
    .select('*')
    .or(
      `and(player1_id.eq.${id1},player2_id.eq.${id2}),and(player1_id.eq.${id2},player2_id.eq.${id1})`
    )
    .maybeSingle()

  // Fetch match data for both players
  const [{ data: md1 }, { data: md2 }] = await Promise.all([
    supabase.from('match_details').select('giornata, squadra, risultato').eq('player_id', id1),
    supabase.from('match_details').select('giornata, squadra, risultato').eq('player_id', id2),
  ])

  const map1 = new Map((md1 ?? []).map((r) => [r.giornata, r]))
  const map2 = new Map((md2 ?? []).map((r) => [r.giornata, r]))

  let partite_insieme = 0
  let vittorie_insieme = 0
  let sconfitte_insieme = 0
  let partite_contro = 0
  let vittorie_g1 = 0
  let vittorie_g2 = 0

  for (const [giornata, r1] of map1) {
    const r2 = map2.get(giornata)
    if (!r2) continue

    if (r1.squadra === r2.squadra) {
      partite_insieme++
      if (r1.risultato === 'V') vittorie_insieme++
      if (r1.risultato === 'S') sconfitte_insieme++
    } else {
      partite_contro++
      if (r1.risultato === 'V') vittorie_g1++
      if (r2.risultato === 'V') vittorie_g2++
    }
  }

  const tag = rivalry?.tag ?? null

  return {
    player1: { id: p1.id, nome: p1.nome },
    player2: { id: p2.id, nome: p2.nome },
    tag,
    stats: {
      partite_insieme,
      vittorie_insieme,
      sconfitte_insieme,
      partite_contro,
      vittorie_g1,
      vittorie_g2,
      totale_partite: partite_insieme + partite_contro,
    },
  }
}
