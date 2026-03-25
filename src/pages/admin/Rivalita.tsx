import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { getPlayers } from '../../api/players'
import type { Player } from '../../lib/schemas'
import { CsvImportModal } from '../../components/admin/CsvImportModal'
import { Skeleton } from '../../components/Skeleton'

interface RivalryRow {
  id: string
  player1_id: string
  player2_id: string
  tag: string | null
  partite_insieme: number
  vittorie_insieme: number
  sconfitte_insieme: number
  partite_contro: number
  vittorie_g1: number
  vittorie_g2: number
  totale_partite: number
}

const TAGS = [
  { value: '', label: 'Nessuno' },
  { value: 'LA SFIDA MAESTRA', label: 'La Sfida Maestra' },
  { value: "DERBY D'ITALIA", label: "Derby d'Italia" },
]

export function AdminRivalita() {
  const [rivalries, setRivalries] = useState<RivalryRow[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)

  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [tag, setTag] = useState('')
  const [partInsieme, setPartInsieme] = useState('0')
  const [vittInsieme, setVittInsieme] = useState('0')
  const [sconfInsieme, setSconfInsieme] = useState('0')
  const [partContro, setPartContro] = useState('0')
  const [vittG1, setVittG1] = useState('0')
  const [vittG2, setVittG2] = useState('0')
  const [totPartite, setTotPartite] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    Promise.all([
      getPlayers(),
      supabase.from('rivalries').select('*').order('totale_partite', { ascending: false }),
    ]).then(([p, { data: r }]) => {
      setPlayers(p)
      setRivalries((r ?? []) as RivalryRow[])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const resetForm = () => {
    setPlayer1(''); setPlayer2(''); setTag('')
    setPartInsieme('0'); setVittInsieme('0'); setSconfInsieme('0')
    setPartContro('0'); setVittG1('0'); setVittG2('0'); setTotPartite('0')
    setEditing(null)
  }

  const startEdit = (r: RivalryRow) => {
    setEditing(r.id); setPlayer1(r.player1_id); setPlayer2(r.player2_id)
    setTag(r.tag ?? ''); setPartInsieme(String(r.partite_insieme))
    setVittInsieme(String(r.vittorie_insieme)); setSconfInsieme(String(r.sconfitte_insieme))
    setPartContro(String(r.partite_contro)); setVittG1(String(r.vittorie_g1))
    setVittG2(String(r.vittorie_g2)); setTotPartite(String(r.totale_partite))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!player1 || !player2) { toast.error('Seleziona entrambi i giocatori'); return }
    if (player1 === player2) { toast.error('I giocatori devono essere diversi'); return }

    setSubmitting(true)
    const rivData = {
      player1_id: player1,
      player2_id: player2,
      tag: tag || null,
      partite_insieme: parseInt(partInsieme) || 0,
      vittorie_insieme: parseInt(vittInsieme) || 0,
      sconfitte_insieme: parseInt(sconfInsieme) || 0,
      partite_contro: parseInt(partContro) || 0,
      vittorie_g1: parseInt(vittG1) || 0,
      vittorie_g2: parseInt(vittG2) || 0,
      totale_partite: parseInt(totPartite) || 0,
    }

    if (editing === 'new') {
      const { error } = await supabase.from('rivalries').insert(rivData)
      if (error) { toast.error(error.message); setSubmitting(false); return }
    } else {
      const { error } = await supabase.from('rivalries').update(rivData).eq('id', editing!)
      if (error) { toast.error(error.message); setSubmitting(false); return }
    }

    setSubmitting(false)
    toast.success(editing === 'new' ? 'Rivalità creata' : 'Rivalità aggiornata')
    resetForm(); loadData()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('rivalries').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Rivalità eliminata'); loadData() }
  }

  const getName = (id: string) => players.find((p) => p.id === id)?.nome ?? '?'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Rivalità</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CsvImportModal sheet="1vs1" onDone={loadData} />
          <button onClick={() => { resetForm(); setEditing('new') }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '0.85rem' }}>+ Nuova</button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>{editing === 'new' ? 'Nuova rivalità' : 'Modifica rivalità'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Giocatore 1 *</label>
              <select value={player1} onChange={(e) => setPlayer1(e.target.value)} required style={{ padding: '0.5rem', width: '100%' }}>
                <option value="">--</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Giocatore 2 *</label>
              <select value={player2} onChange={(e) => setPlayer2(e.target.value)} required style={{ padding: '0.5rem', width: '100%' }}>
                <option value="">--</option>
                {players.filter((p) => p.id !== player1).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tag</label>
              <select value={tag} onChange={(e) => setTag(e.target.value)} style={{ padding: '0.5rem', width: '100%' }}>
                {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {([
              ['Partite insieme', partInsieme, setPartInsieme],
              ['Vittorie insieme', vittInsieme, setVittInsieme],
              ['Sconfitte insieme', sconfInsieme, setSconfInsieme],
              ['Partite contro', partContro, setPartContro],
              ['Vittorie G1', vittG1, setVittG1],
              ['Vittorie G2', vittG2, setVittG2],
              ['Totale partite', totPartite, setTotPartite],
            ] as const).map(([label, val, setter]) => (
              <div key={label}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
                <input type="number" value={val} onChange={(e) => (setter as (v: string) => void)(e.target.value)} style={{ padding: '0.5rem', width: '100%' }} />
              </div>
            ))}
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

      {rivalries.map((r) => (
        <div key={r.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem',
        }}>
          <div>
            <span style={{ fontWeight: 600 }}>{getName(r.player1_id)}</span>
            <span style={{ color: 'var(--text-secondary)', margin: '0 0.4rem' }}>vs</span>
            <span style={{ fontWeight: 600 }}>{getName(r.player2_id)}</span>
            {r.tag && (
              <span style={{
                background: r.tag === 'LA SFIDA MAESTRA' ? 'var(--accent)' : 'var(--danger)',
                color: r.tag === 'LA SFIDA MAESTRA' ? '#000' : '#fff',
                padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, marginLeft: '0.5rem',
              }}>{r.tag}</span>
            )}
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{r.totale_partite} partite</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            <button onClick={() => startEdit(r)} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>Modifica</button>
            <button onClick={() => handleDelete(r.id)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Elimina</button>
          </div>
        </div>
      ))}
    </div>
  )
}
