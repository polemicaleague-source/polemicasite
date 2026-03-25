import { supabase } from '../lib/supabase'
import { importResultSchema, type ImportResult } from '../lib/schemas'

export async function importCsv(
  sheet: 'dettaglio' | 'rating' | '1vs1' | 'news' | 'manifesto',
  file: File
): Promise<ImportResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    // Try refreshing the session
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (!refreshed.session?.access_token) {
      throw new Error('Non autenticato')
    }
    return doImport(sheet, file, refreshed.session.access_token)
  }
  return doImport(sheet, file, session.access_token)
}

async function doImport(
  sheet: string,
  file: File,
  token: string
): Promise<ImportResult> {
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

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Non autenticato')
  }
  if (res.status === 403) throw new Error('Solo admin')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Import failed: ${res.status}`)
  }

  const json: unknown = await res.json()
  return importResultSchema.parse(json)
}
