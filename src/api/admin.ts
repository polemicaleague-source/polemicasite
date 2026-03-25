import { supabase } from '../lib/supabase'
import { importResultSchema, type ImportResult } from '../lib/schemas'

export async function importCsv(
  sheet: 'dettaglio' | 'rating' | '1vs1' | 'news' | 'manifesto',
  file: File
): Promise<ImportResult> {
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const formData = new FormData()
  formData.append('sheet', sheet)
  formData.append('file', file)

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-csv`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: formData,
    }
  )

  if (res.status === 401) throw new Error('Non autenticato')
  if (res.status === 403) throw new Error('Solo admin')
  if (!res.ok) throw new Error(`Import failed: ${res.status}`)

  const json: unknown = await res.json()
  return importResultSchema.parse(json)
}
