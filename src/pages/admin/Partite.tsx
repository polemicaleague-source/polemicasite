import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { getPlayers } from '../../api/players'
import type { Player } from '../../lib/schemas'
import { CsvImportModal } from '../../components/admin/CsvImportModal'
import { Skeleton } from '../../components/Skeleton'

interface MatchRow {
  squadra: string
  player_id: string
  er: string
  gol: string
  autogol: string
  assist: string
  voto: string
  gol_squadra: string
  gol_avversari: string
  risultato: string
  differenza_reti: string
}

const emptyRow = (): MatchRow => ({
  squadra: 'A', player_id: '', er: '', gol: '0', autogol: '0', assist: '0',
  voto: '', gol_squadra: '', gol_avversari: '', risultato: 'V', differenza_reti: '0',
})

export function AdminPartite() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [giornata, setGiornata] = useState('')
  const [data, setData] = useState('')
  const [campo, setCampo] = useState('')
  const [ora, setOra] = useState('')
  const [rows, setRows] = useState<MatchRow[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)

  // Existing matches list
  const [matches, setMatches] = useState<{ giornata: number; data: string; count: number }[]>([])

  const loadData = () => {
    getPlayers().then(setPlayers).catch(() => {})
    supabase
      .from('match_details')
      .select('giornata, data')
      .order('giornata', { ascending: false })
      .then(({ data: md }) => {
        if (!md) { setLoading(false); return }
        const grouped = md.reduce<Record<number, { data: string; count: number }>>((acc, r) => {
          if (!acc[r.giornata]) acc[r.giornata] = { data: r.data, count: 0 }
          acc[r.giornata].count++
          return acc
        }, {})
        setMatches(Object.entries(grouped).map(([g, v]) => ({ giornata: Number(g), ...v })))
        setLoading(false)
      })
  }

  useEffect(loadData, [])

  const updateRow = (idx: number, field: keyof MatchRow, value: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giornata || !data) { toast.error('Giornata e Data obbligatori'); return }

    const toInsert = rows
      .filter((r) => r.player_id)
      .map((r) => ({
        giornata: parseInt(giornata),
        data,
        campo: campo || null,
        ora: ora || null,
        squadra: r.squadra,
        player_id: r.player_id,
        er: r.er ? parseFloat(r.er) : null,
        gol: parseInt(r.gol) || 0,
        autogol: parseInt(r.autogol) || 0,
        assist: parseInt(r.assist) || 0,
        voto: r.voto ? parseFloat(r.voto) : null,
        gol_squadra: parseInt(r.gol_squadra) || 0,
        gol_avversari: parseInt(r.gol_avversari) || 0,
        risultato: r.risultato,
        differenza_reti: parseInt(r.differenza_reti) || 0,
      }))

    if (toInsert.length === 0) { toast.error('Aggiungi almeno un giocatore'); return }

    setSubmitting(true)
    const { error } = await supabase.from('match_details').insert(toInsert)
    setSubmitting(false)

    if (error) {
      toast.error(`Errore: ${error.message}`)
    } else {
      toast.success(`Partita giornata ${giornata} salvata`)
      setGiornata('')
      setData('')
      setCampo('')
      setOra('')
      setRows([emptyRow()])
      loadData()
    }
  }

  const handleDelete = async (g: number) => {
    const { error } = await supabase.from('match_details').delete().eq('giornata', g)
    if (error) toast.error(error.message)
    else { toast.success(`Giornata ${g} eliminata`); loadData() }
  }

  const fieldStyle: React.CSSProperties = { padding: '0.4rem', fontSize: '0.8rem', width: '100%' }
  const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Partite</h1>
        <CsvImportModal sheet="dettaglio" onDone={loadData} />
      </div>

      {/* New match form */}
      <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Nuova partita</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={labelStyle}>Giornata</div>
            <input type="number" value={giornata} onChange={(e) => setGiornata(e.target.value)} required style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Data</div>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Campo</div>
            <input value={campo} onChange={(e) => setCampo(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Ora</div>
            <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        {/* Player rows */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                {['Sq', 'Giocatore', 'ER', 'Gol', 'AG', 'Ass', 'Voto', 'GS', 'GA', 'Ris', 'DR', ''].map((h) => (
                  <th key={h} style={{ padding: '0.4rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '0.3rem' }}>
                    <select value={row.squadra} onChange={(e) => updateRow(idx, 'squadra', e.target.value)} style={{ ...fieldStyle, width: 50 }}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.3rem' }}>
                    <select value={row.player_id} onChange={(e) => updateRow(idx, 'player_id', e.target.value)} style={{ ...fieldStyle, minWidth: 140 }}>
                      <option value="">--</option>
                      {players.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.3rem' }}><input value={row.er} onChange={(e) => updateRow(idx, 'er', e.target.value)} style={{ ...fieldStyle, width: 55 }} placeholder="-" /></td>
                  <td style={{ padding: '0.3rem' }}><input type="number" value={row.gol} onChange={(e) => updateRow(idx, 'gol', e.target.value)} style={{ ...fieldStyle, width: 45 }} /></td>
                  <td style={{ padding: '0.3rem' }}><input type="number" value={row.autogol} onChange={(e) => updateRow(idx, 'autogol', e.target.value)} style={{ ...fieldStyle, width: 45 }} /></td>
                  <td style={{ padding: '0.3rem' }}><input type="number" value={row.assist} onChange={(e) => updateRow(idx, 'assist', e.target.value)} style={{ ...fieldStyle, width: 45 }} /></td>
                  <td style={{ padding: '0.3rem' }}><input value={row.voto} onChange={(e) => updateRow(idx, 'voto', e.target.value)} style={{ ...fieldStyle, width: 55 }} placeholder="-" /></td>
                  <td style={{ padding: '0.3rem' }}><input type="number" value={row.gol_squadra} onChange={(e) => updateRow(idx, 'gol_squadra', e.target.value)} style={{ ...fieldStyle, width: 45 }} /></td>
                  <td style={{ padding: '0.3rem' }}><input type="number" value={row.gol_avversari} onChange={(e) => updateRow(idx, 'gol_avversari', e.target.value)} style={{ ...fieldStyle, width: 45 }} /></td>
                  <td style={{ padding: '0.3rem' }}>
                    <select value={row.risultato} onChange={(e) => updateRow(idx, 'risultato', e.target.value)} style={{ ...fieldStyle, width: 50 }}>
                      <option value="V">V</option>
                      <option value="P">P</option>
                      <option value="S">S</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.3rem' }}><input type="number" value={row.differenza_reti} onChange={(e) => updateRow(idx, 'differenza_reti', e.target.value)} style={{ ...fieldStyle, width: 45 }} /></td>
                  <td style={{ padding: '0.3rem' }}>
                    <button type="button" onClick={() => setRows((p) => p.filter((_, i) => i !== idx))} style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setRows((p) => [...p, emptyRow()])}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #333', fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent)' }}
          >
            + Aggiungi giocatore
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Salvataggio...' : 'Salva partita'}
          </button>
        </div>
      </form>

      {/* Existing matches */}
      <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Partite inserite</h3>
      {loading && <Skeleton height="2.5rem" count={4} />}
      {matches.map((m) => (
        <div key={m.giornata} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '0.5rem',
        }}>
          <div>
            <span style={{ fontWeight: 600 }}>Giornata {m.giornata}</span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.75rem', fontSize: '0.85rem' }}>{m.data} — {m.count} giocatori</span>
          </div>
          <button onClick={() => handleDelete(m.giornata)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Elimina</button>
        </div>
      ))}
    </div>
  )
}
