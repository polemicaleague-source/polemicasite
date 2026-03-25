import { supabase } from '../lib/supabase'
import { playerTrendResponseSchema, type PlayerTrendResponse } from '../lib/schemas'

export async function getPlayerTrend(id: string): Promise<PlayerTrendResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-player-trend?id=${id}`
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token ?? ''

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  })

  if (!res.ok) throw new Error(`get-player-trend failed: ${res.status}`)
  const json: unknown = await res.json()
  return playerTrendResponseSchema.parse(json)
}
