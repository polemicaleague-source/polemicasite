import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { getNews, type NewsItem } from '../../api/news'
import { CsvImportModal } from '../../components/admin/CsvImportModal'
import { Skeleton } from '../../components/Skeleton'

export function AdminNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)

  const [giornata, setGiornata] = useState('')
  const [data, setData] = useState('')
  const [posizione, setPosizione] = useState('')
  const [titolo, setTitolo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    getNews().then(setNews).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const resetForm = () => {
    setGiornata(''); setData(''); setPosizione(''); setTitolo(''); setCorpo(''); setEditing(null)
  }

  const startEdit = (n: NewsItem) => {
    setEditing(n.id)
    setGiornata(n.giornata.toString())
    setData(n.data ?? '')
    setPosizione(n.posizione?.toString() ?? '')
    setTitolo(n.titolo)
    setCorpo(n.corpo ?? '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giornata || !titolo.trim()) { toast.error('Giornata e Titolo obbligatori'); return }

    setSubmitting(true)
    const newsData = {
      giornata: parseInt(giornata),
      data: data || null,
      posizione: posizione ? parseInt(posizione) : null,
      titolo: titolo.trim(),
      corpo: corpo.trim() || null,
    }

    if (editing === 'new') {
      const { error } = await supabase.from('news').insert(newsData)
      if (error) { toast.error(error.message); setSubmitting(false); return }
    } else {
      const { error } = await supabase.from('news').update(newsData).eq('id', editing!)
      if (error) { toast.error(error.message); setSubmitting(false); return }
    }

    setSubmitting(false)
    toast.success(editing === 'new' ? 'News creata' : 'News aggiornata')
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('news').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('News eliminata'); loadData() }
  }

  // Group by giornata
  const grouped = news.reduce<Record<number, NewsItem[]>>((acc, item) => {
    ;(acc[item.giornata] ??= []).push(item)
    return acc
  }, {})
  const giornate = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>News</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CsvImportModal sheet="news" onDone={loadData} />
          <button
            onClick={() => { resetForm(); setEditing('new') }}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '0.85rem' }}
          >
            + Nuova
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>{editing === 'new' ? 'Nuova news' : 'Modifica news'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Giornata *</label>
              <input type="number" value={giornata} onChange={(e) => setGiornata(e.target.value)} required style={{ padding: '0.5rem', width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ padding: '0.5rem', width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Posizione</label>
              <input type="number" value={posizione} onChange={(e) => setPosizione(e.target.value)} style={{ padding: '0.5rem', width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Titolo *</label>
            <input value={titolo} onChange={(e) => setTitolo(e.target.value)} required style={{ padding: '0.5rem', width: '100%' }} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Corpo</label>
            <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={4} style={{ padding: '0.5rem', width: '100%', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Salvataggio...' : 'Salva'}
            </button>
            <button type="button" onClick={resetForm} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #333', fontWeight: 600, color: 'var(--text-secondary)' }}>Annulla</button>
          </div>
        </form>
      )}

      {loading && <Skeleton height="2.5rem" count={6} />}

      {giornate.map((g) => (
        <div key={g} style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Giornata {g}
          </div>
          {grouped[g].map((n) => (
            <div key={n.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--surface)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.4rem',
            }}>
              <span style={{ fontWeight: 500 }}>{n.titolo}</span>
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <button onClick={() => startEdit(n)} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>Modifica</button>
                <button onClick={() => handleDelete(n.id)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
