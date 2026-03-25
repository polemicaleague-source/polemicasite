import { supabase } from '../lib/supabase'
import { oneVsOneResponseSchema, type OneVsOneResponse } from '../lib/schemas'

export async function get1vs1(id1: string, id2: string): Promise<OneVsOneResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-1vs1?id1=${id1}&id2=${id2}`
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token ?? ''

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  })

  if (!res.ok) throw new Error(`get-1vs1 failed: ${res.status}`)
  const json: unknown = await res.json()
  return oneVsOneResponseSchema.parse(json)
}
