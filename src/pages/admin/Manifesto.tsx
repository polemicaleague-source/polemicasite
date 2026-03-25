import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { getManifesto, type ManifestoArticle } from '../../api/news'
import { CsvImportModal } from '../../components/admin/CsvImportModal'
import { Skeleton } from '../../components/Skeleton'

export function AdminManifesto() {
  const [articles, setArticles] = useState<ManifestoArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)

  const [articolo, setArticolo] = useState('')
  const [nomeArticolo, setNomeArticolo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    getManifesto().then(setArticles).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const resetForm = () => { setArticolo(''); setNomeArticolo(''); setCorpo(''); setEditing(null) }

  const startEdit = (a: ManifestoArticle) => {
    setEditing(a.id); setArticolo(a.articolo); setNomeArticolo(a.nome_articolo); setCorpo(a.corpo ?? '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!articolo.trim() || !nomeArticolo.trim()) { toast.error('Articolo e Nome obbligatori'); return }

    setSubmitting(true)
    const artData = {
      articolo: articolo.trim(),
      nome_articolo: nomeArticolo.trim(),
      corpo: corpo.trim() || null,
    }

    if (editing === 'new') {
      const { error } = await supabase.from('manifesto').insert(artData)
      if (error) { toast.error(error.message); setSubmitting(false); return }
    } else {
      const { error } = await supabase.from('manifesto').update(artData).eq('id', editing!)
      if (error) { toast.error(error.message); setSubmitting(false); return }
    }

    setSubmitting(false)
    toast.success(editing === 'new' ? 'Articolo creato' : 'Articolo aggiornato')
    resetForm(); loadData()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('manifesto').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Articolo eliminato'); loadData() }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manifesto</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CsvImportModal sheet="manifesto" onDone={loadData} />
          <button onClick={() => { resetForm(); setEditing('new') }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '0.85rem' }}>+ Nuovo</button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>{editing === 'new' ? 'Nuovo articolo' : 'Modifica articolo'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Articolo *</label>
              <input value={articolo} onChange={(e) => setArticolo(e.target.value)} required placeholder="es. 3bis" style={{ padding: '0.5rem', width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nome articolo *</label>
              <input value={nomeArticolo} onChange={(e) => setNomeArticolo(e.target.value)} required style={{ padding: '0.5rem', width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Corpo</label>
            <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={6} style={{ padding: '0.5rem', width: '100%', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Salvataggio...' : 'Salva'}
            </button>
            <button type="button" onClick={resetForm} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #333', fontWeight: 600, color: 'var(--text-secondary)' }}>Annulla</button>
          </div>
        </form>
      )}

      {loading && <Skeleton height="2.5rem" count={5} />}

      {articles.map((a) => (
        <div key={a.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem',
        }}>
          <div>
            <span style={{ background: 'var(--accent)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, marginRight: '0.5rem' }}>Art. {a.articolo}</span>
            <span style={{ fontWeight: 500 }}>{a.nome_articolo}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            <button onClick={() => startEdit(a)} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>Modifica</button>
            <button onClick={() => handleDelete(a.id)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Elimina</button>
          </div>
        </div>
      ))}
    </div>
  )
}
