import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { importCsv } from '../../api/admin'
import type { ImportResult } from '../../lib/schemas'

interface Props {
  sheet: 'dettaglio' | 'rating' | '1vs1' | 'news' | 'manifesto'
  onDone: () => void
}

export function CsvImportModal({ sheet, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Seleziona un file CSV'); return }
    setLoading(true)
    try {
      const res = await importCsv(sheet, file)
      setResult(res)
      toast.success(`Inseriti: ${res.inserted}, Saltati: ${res.skipped}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore import')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: '1px solid #333',
          fontWeight: 600,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        Importa CSV
      </button>
    )
  }

  return (
    <>
      <div
        onClick={() => { setOpen(false); setResult(null) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        width: '90%',
        maxWidth: 480,
        zIndex: 301,
      }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Importa {sheet}.csv</h3>

        <input ref={fileRef} type="file" accept=".csv" style={{ marginBottom: '1rem', width: '100%' }} />

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={handleImport}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 700,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Importazione...' : 'Importa'}
          </button>
          <button
            onClick={() => { setOpen(false); setResult(null) }}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid #333',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Chiudi
          </button>
        </div>

        {result && (
          <div style={{
            background: 'var(--bg)',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '0.85rem',
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>Inseriti: {result.inserted}</span>
              {' | '}
              <span style={{ color: '#eab308', fontWeight: 600 }}>Saltati: {result.skipped}</span>
            </div>
            {result.errors.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    Riga {e.row}: {e.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
