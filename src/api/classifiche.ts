import { supabase } from '../lib/supabase'
import type { ClassificaRow } from '../lib/schemas'

export type ClassificheResult = {
  data: ClassificaRow[]
  total: number
}

export async function getClassifiche(
  type: 'marcatori' | 'assist' | 'voto'
): Promise<ClassificheResult> {
  // Fetch aggregated stats from the view
  const { data: rows, error } = await supabase
    .from('v_gcp')
    .select('*')

  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return { data: [], total: 0 }

  // Fetch last 5 results per player for streak
  const playerIds = rows.map((r: any) => r.id)
  const { data: matchRows } = await supabase
    .from('match_details')
    .select('player_id, giornata, risultato')
    .in('player_id', playerIds)
    .order('giornata', { ascending: false })

  const streakMap = new Map<string, string[]>()
  for (const m of matchRows ?? []) {
    const arr = streakMap.get(m.player_id) ?? []
    if (arr.length < 5) arr.push(m.risultato)
    streakMap.set(m.player_id, arr)
  }

  function computeStreak(results: string[]): string | null {
    if (!results || results.length === 0) return null
    const first = results[0]
    let count = 0
    for (const r of results) {
      if (r === first) count++
      else break
    }
    return `${count}${first}`
  }

  // Sort by requested metric
  const sortKey = type === 'marcatori' ? 'gol_totali' : type === 'assist' ? 'assist_totali' : 'media_voto'
  const sorted = (rows as any[]).sort((a, b) => {
    const va = a[sortKey] as number | null
    const vb = b[sortKey] as number | null
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    return vb - va
  })

  const data: ClassificaRow[] = sorted.map((r) => ({
    id: r.id,
    nome: r.nome,
    presenze: Number(r.presenze),
    gol_totali: Number(r.gol_totali),
    assist_totali: Number(r.assist_totali),
    media_voto: r.media_voto !== null ? Number(r.media_voto) : null,
    plus_minus: Number(r.plus_minus),
    streak: computeStreak(streakMap.get(r.id) ?? []),
    last_5: streakMap.get(r.id) ?? [],
  }))

  return { data, total: data.length }
}
