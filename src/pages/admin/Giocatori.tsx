import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { getPlayers } from '../../api/players'
import type { Player } from '../../lib/schemas'
import { CsvImportModal } from '../../components/admin/CsvImportModal'
import { Skeleton } from '../../components/Skeleton'

const RUOLI = ['CC', 'TD', 'ATT', 'TS', 'DC', 'CS', 'POR', 'CD'] as const

export function AdminGiocatori() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // player id or 'new'

  // Form state
  const [nome, setNome] = useState('')
  const [baseRating, setBaseRating] = useState('')
  const [lastEr, setLastEr] = useState('')
  const [deltaRating, setDeltaRating] = useState('')
  const [tenore, setTenore] = useState('')
  const [tratto, setTratto] = useState('')
  const [ruoli, setRuoli] = useState<string[]>(['', '', '', ''])
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    getPlayers().then(setPlayers).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const resetForm = () => {
    setNome(''); setBaseRating(''); setLastEr(''); setDeltaRating(''); setTenore(''); setTratto('')
    setRuoli(['', '', '', '']); setEditing(null)
  }

  const startEdit = (p: Player) => {
    setEditing(p.id)
    setNome(p.nome)
    setBaseRating(p.base_rating?.toString() ?? '')
    setLastEr(p.last_er?.toString() ?? '')
    setDeltaRating(p.delta_rating?.toString() ?? '')
    setTenore(p.tenore_fisico ?? '')
    setTratto(p.tratto ?? '')
    const roles = p.player_roles?.sort((a, b) => a.ordine - b.ordine).map((r) => r.ruolo) ?? []
    setRuoli([roles[0] ?? '', roles[1] ?? '', roles[2] ?? '', roles[3] ?? ''])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Nome obbligatorio'); return }

    setSubmitting(true)
    const playerData = {
      nome: nome.trim(),
      base_rating: baseRating ? parseFloat(baseRating) : null,
      last_er: lastEr ? parseFloat(lastEr) : null,
      delta_rating: deltaRating ? parseFloat(deltaRating) : null,
      tenore_fisico: tenore.trim() || null,
      tratto: tratto.trim() || null,
    }

    let playerId: string

    if (editing === 'new') {
      const { data, error } = await supabase.from('players').insert(playerData).select('id').single()
      if (error) { toast.error(error.message); setSubmitting(false); return }
      playerId = data.id
    } else {
      const { error } = await supabase.from('players').update(playerData).eq('id', editing!)
      if (error) { toast.error(error.message); setSubmitting(false); return }
      playerId = editing!
    }

    // Upsert roles
    await supabase.from('player_roles').delete().eq('player_id', playerId)
    const roleRows = ruoli
      .map((r, i) => r ? { player_id: playerId, ruolo: r, ordine: i + 1 } : null)
      .filter(Boolean)
    if (roleRows.length > 0) {
      await supabase.from('player_roles').insert(roleRows)
    }

    setSubmitting(false)
    toast.success(editing === 'new' ? `${nome} creato` : `${nome} aggiornato`)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`${name} eliminato`); loadData() }
  }

  const fieldStyle: React.CSSProperties = { padding: '0.5rem', fontSize: '0.9rem', width: '100%' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Giocatori</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CsvImportModal sheet="rating" onDone={loadData} />
          <button
            onClick={() => { resetForm(); setEditing('new') }}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '0.85rem' }}
          >
            + Nuovo
          </button>
        </div>
      </div>

      {/* Form */}
      {editing && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>{editing === 'new' ? 'Nuovo giocatore' : 'Modifica giocatore'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nome *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Base Rating</label>
              <input value={baseRating} onChange={(e) => setBaseRating(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Last ER</label>
              <input value={lastEr} onChange={(e) => setLastEr(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Delta Rating</label>
              <input value={deltaRating} onChange={(e) => setDeltaRating(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tenore fisico</label>
              <input value={tenore} onChange={(e) => setTenore(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tratto distintivo</label>
              <input value={tratto} onChange={(e) => setTratto(e.target.value)} style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {ruoli.map((r, i) => (
              <div key={i} style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ruolo {i + 1}</label>
                <select
                  value={r}
                  onChange={(e) => setRuoli((prev) => prev.map((v, j) => j === i ? e.target.value : v))}
                  style={fieldStyle}
                >
                  <option value="">-</option>
                  {RUOLI.map((ruolo) => <option key={ruolo} value={ruolo}>{ruolo}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Salvataggio...' : 'Salva'}
            </button>
            <button type="button" onClick={resetForm} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #333', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* Player list */}
      {loading && <Skeleton height="2.5rem" count={6} />}
      {players.map((p) => (
        <div key={p.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem',
        }}>
          <div>
            <span style={{ fontWeight: 600 }}>{p.nome}</span>
            {p.player_roles && p.player_roles.length > 0 && (
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                {p.player_roles.sort((a, b) => a.ordine - b.ordine).map((r) => r.ruolo).join(', ')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => startEdit(p)} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>Modifica</button>
            <button onClick={() => handleDelete(p.id, p.nome)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Elimina</button>
          </div>
        </div>
      ))}
    </div>
  )
}
