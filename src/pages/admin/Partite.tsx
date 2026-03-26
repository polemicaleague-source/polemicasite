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
}

const emptyRow = (): MatchRow => ({
  squadra: 'A', player_id: '', er: '', gol: '0', autogol: '0', assist: '0', voto: '',
})

export function AdminPartite() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [giornata, setGiornata] = useState('')
  const [data, setData] = useState('')
  const [campo, setCampo] = useState('')
  const [ora, setOra] = useState('')
  const [golSquadraA, setGolSquadraA] = useState('')
  const [golSquadraB, setGolSquadraB] = useState('')
  const [rows, setRows] = useState<MatchRow[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)

  // Existing matches list
  const [matches, setMatches] = useState<{ giornata: number; data: string; campo: string | null; golA: number; golB: number; count: number }[]>([])
  const [visibleMatches, setVisibleMatches] = useState(10)

  const loadData = () => {
    getPlayers().then(setPlayers).catch(() => {})
    supabase
      .from('match_details')
      .select('giornata, data, campo, squadra, gol_squadra')
      .order('giornata', { ascending: false })
      .then(({ data: md }) => {
        if (!md) { setLoading(false); return }
        const grouped = md.reduce<Record<number, { data: string; campo: string | null; golA: number; golB: number; count: number }>>((acc, r) => {
          if (!acc[r.giornata]) acc[r.giornata] = { data: r.data, campo: r.campo, golA: -1, golB: -1, count: 0 }
          acc[r.giornata].count++
          if (r.squadra === 'A' && acc[r.giornata].golA === -1) acc[r.giornata].golA = r.gol_squadra
          if (r.squadra === 'B' && acc[r.giornata].golB === -1) acc[r.giornata].golB = r.gol_squadra
          return acc
        }, {})
        setMatches(Object.entries(grouped).map(([g, v]) => ({ giornata: Number(g), ...v, golA: v.golA === -1 ? 0 : v.golA, golB: v.golB === -1 ? 0 : v.golB })).sort((a, b) => b.giornata - a.giornata))
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

    const golA = parseInt(golSquadraA)
    const golB = parseInt(golSquadraB)
    if (isNaN(golA) || isNaN(golB)) { toast.error('Inserisci i gol di entrambe le squadre'); return }

    const toInsert = rows
      .filter((r) => r.player_id)
      .map((r) => {
        const isTeamA = r.squadra === 'A'
        const myGoals = isTeamA ? golA : golB
        const theirGoals = isTeamA ? golB : golA
        const diff = myGoals - theirGoals
        const risultato = diff > 0 ? 'V' : diff < 0 ? 'S' : 'P'

        return {
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
          gol_squadra: myGoals,
          gol_avversari: theirGoals,
          risultato,
          differenza_reti: diff,
        }
      })

    if (toInsert.length === 0) { toast.error('Aggiungi almeno un giocatore'); return }

    setSubmitting(true)

    let error: any = null
    if (editing !== null) {
      const { error: delErr } = await supabase.from('match_details').delete().eq('giornata', editing)
      if (delErr) { error = delErr } else {
        const { error: insErr } = await supabase.from('match_details').insert(toInsert)
        error = insErr
      }
    } else {
      const { error: insErr } = await supabase.from('match_details').insert(toInsert)
      error = insErr
    }

    setSubmitting(false)

    if (error) {
      toast.error(`Errore: ${error.message}`)
    } else {
      // Recalculate expected_rating for affected players
      const playerIds = toInsert.map((r) => r.player_id)
      await supabase.rpc('recalc_expected_rating', { p_ids: playerIds })
      toast.success(editing !== null ? `Giornata ${giornata} aggiornata` : `Partita giornata ${giornata} salvata`)
      cancelEdit()
      loadData()
    }
  }

  const handleEdit = async (g: number) => {
    const { data: md } = await supabase
      .from('match_details')
      .select('*')
      .eq('giornata', g)
      .order('squadra')
    if (!md || md.length === 0) { toast.error('Nessun dato trovato'); return }

    setEditing(g)
    setGiornata(String(md[0].giornata))
    setData(md[0].data)
    setCampo(md[0].campo || '')
    setOra(md[0].ora ? md[0].ora.slice(0, 5) : '')

    // Extract team-level goals from first row of each team
    const teamA = md.find((r: any) => r.squadra === 'A')
    const teamB = md.find((r: any) => r.squadra === 'B')
    setGolSquadraA(teamA ? String(teamA.gol_squadra) : '0')
    setGolSquadraB(teamB ? String(teamB.gol_squadra) : '0')

    setRows(md.map((r: any) => ({
      squadra: r.squadra,
      player_id: r.player_id,
      er: r.er != null ? String(r.er) : '',
      gol: String(r.gol),
      autogol: String(r.autogol),
      assist: String(r.assist),
      voto: r.voto != null ? String(r.voto) : '',
    })))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setGiornata('')
    setData('')
    setCampo('')
    setOra('')
    setGolSquadraA('')
    setGolSquadraB('')
    setRows([emptyRow()])
  }

  const handleDelete = async (g: number) => {
    if (!confirm(`Sei sicuro di voler eliminare la giornata ${g}? Tutti i dati verranno persi.`)) return
    // Get affected player IDs before deleting
    const { data: affected } = await supabase.from('match_details').select('player_id').eq('giornata', g)
    const playerIds = [...new Set((affected ?? []).map((r: any) => r.player_id))]
    const { error } = await supabase.from('match_details').delete().eq('giornata', g)
    if (error) toast.error(error.message)
    else {
      if (playerIds.length > 0) await supabase.rpc('recalc_expected_rating', { p_ids: playerIds })
      toast.success(`Giornata ${g} eliminata`); if (editing === g) cancelEdit(); loadData()
    }
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
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>
          {editing !== null ? `Modifica giornata ${editing}` : 'Nuova partita'}
        </h3>

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

        {/* Team scores */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '1.25rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          border: '1px solid #333',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...labelStyle, marginBottom: '0.4rem' }}>Gol Squadra A</div>
            <input
              type="number"
              min="0"
              value={golSquadraA}
              onChange={(e) => setGolSquadraA(e.target.value)}
              required
              style={{ ...fieldStyle, width: 60, textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '1rem' }}>—</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...labelStyle, marginBottom: '0.4rem' }}>Gol Squadra B</div>
            <input
              type="number"
              min="0"
              value={golSquadraB}
              onChange={(e) => setGolSquadraB(e.target.value)}
              required
              style={{ ...fieldStyle, width: 60, textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>
        </div>

        {/* Player rows */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                {['Sq', 'Giocatore', 'ER', 'Gol', 'AG', 'Ass', 'Voto', ''].map((h) => (
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
            {submitting ? 'Salvataggio...' : editing !== null ? 'Aggiorna partita' : 'Salva partita'}
          </button>
          {editing !== null && (
            <button
              type="button"
              onClick={cancelEdit}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #333', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}
            >
              Annulla
            </button>
          )}
        </div>
      </form>

      {/* Existing matches */}
      <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Partite inserite</h3>
      {loading && <Skeleton height="2.5rem" count={4} />}
      {matches.slice(0, visibleMatches).map((m) => (
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
            <span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: '0.75rem', fontSize: '0.9rem' }}>{m.golA} - {m.golB}</span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.75rem', fontSize: '0.85rem' }}>{m.data}{m.campo ? ` — ${m.campo}` : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => handleEdit(m.giornata)} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>Modifica</button>
            <button onClick={() => handleDelete(m.giornata)} style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>Elimina</button>
          </div>
        </div>
      ))}
      {visibleMatches < matches.length && (
        <button
          onClick={() => setVisibleMatches((v) => v + 10)}
          style={{
            display: 'block',
            margin: '1rem auto',
            padding: '0.5rem 1.5rem',
            borderRadius: '8px',
            background: 'var(--surface)',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: '0.85rem',
            border: '1px solid #333',
          }}
        >
          Mostra altri
        </button>
      )}
    </div>
  )
}
