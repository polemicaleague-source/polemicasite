import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getPlayers } from '../api/players'
import { get1vs1 } from '../api/1vs1'
import type { Player, OneVsOneResponse } from '../lib/schemas'
import { Skeleton } from '../components/Skeleton'

export function OneVsOne() {
  const [players, setPlayers] = useState<Player[]>([])
  const [id1, setId1] = useState('')
  const [id2, setId2] = useState('')
  const [result, setResult] = useState<OneVsOneResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => {})
      .finally(() => setLoadingPlayers(false))
  }, [])

  const handleCompare = () => {
    if (!id1 || !id2 || id1 === id2) return
    setLoading(true)
    get1vs1(id1, id2)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>1 vs 1</h1>

      {loadingPlayers ? (
        <Skeleton height="3rem" count={2} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          <select
            value={id1}
            onChange={(e) => setId1(e.target.value)}
            style={{ padding: '0.75rem', fontSize: '1rem' }}
          >
            <option value="">Seleziona giocatore 1</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <select
            value={id2}
            onChange={(e) => setId2(e.target.value)}
            style={{ padding: '0.75rem', fontSize: '1rem' }}
          >
            <option value="">Seleziona giocatore 2</option>
            {players.filter((p) => p.id !== id1).map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <button
            onClick={handleCompare}
            disabled={!id1 || !id2 || id1 === id2 || loading}
            style={{
              background: 'var(--accent)',
              color: '#000',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'uppercase',
              opacity: (!id1 || !id2 || id1 === id2) ? 0.4 : 1,
            }}
          >
            Confronta
          </button>
        </div>
      )}

      {loading && <Skeleton height="12rem" />}

      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
          }}
        >
          {/* Tag badge */}
          {result.tag && (
            <div style={{
              display: 'inline-block',
              background: result.tag === 'LA SFIDA MAESTRA' ? 'var(--accent)' : 'var(--danger)',
              color: result.tag === 'LA SFIDA MAESTRA' ? '#000' : '#fff',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              marginBottom: '1rem',
              textTransform: 'uppercase',
            }}>
              {result.tag}
            </div>
          )}

          {/* Player names header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{result.player1.nome}</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>VS</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{result.player2.nome}</span>
          </div>

          {/* Stats rows */}
          {([
            ['Partite insieme', result.stats.partite_insieme],
            ['Vittorie insieme', result.stats.vittorie_insieme],
            ['Sconfitte insieme', result.stats.sconfitte_insieme],
            ['Partite contro', result.stats.partite_contro],
            [`Vittorie ${result.player1.nome.split(' ')[0]}`, result.stats.vittorie_g1],
            [`Vittorie ${result.player2.nome.split(' ')[0]}`, result.stats.vittorie_g2],
            ['Totale partite', result.stats.totale_partite],
          ] as const).map(([label, value]) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid #333',
              fontSize: '0.9rem',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
