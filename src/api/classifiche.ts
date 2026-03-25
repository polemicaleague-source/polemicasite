import { supabase } from '../lib/supabase'
import { classificheResponseSchema, type ClassificheResponse } from '../lib/schemas'

export async function getClassifiche(
  type: 'gcp' | 'voto' | 'marcatori',
  page = 1,
  limit = 50
): Promise<ClassificheResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-classifiche?type=${type}&page=${page}&limit=${limit}`
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token ?? ''

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  })

  if (!res.ok) throw new Error(`get-classifiche failed: ${res.status}`)
  const json: unknown = await res.json()
  return classificheResponseSchema.parse(json)
}
