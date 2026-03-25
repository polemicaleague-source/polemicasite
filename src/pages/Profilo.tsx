import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getPlayerTrend } from '../api/trend'
import type { PlayerTrendResponse } from '../lib/schemas'
import { Skeleton } from '../components/Skeleton'

const streakColors: Record<string, string> = { V: '#22c55e', P: '#eab308', S: '#ef4444' }

export function Profilo() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PlayerTrendResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPlayerTrend(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '1rem' }}><Skeleton height="2rem" count={8} /></div>
  if (error) return <p style={{ padding: '1rem', color: 'var(--danger)' }}>{error}</p>
  if (!data) return null

  const { player, stats, streak, trend } = data
  const roles = player.player_roles?.sort((a, b) => a.ordine - b.ordine).map((r) => r.ruolo) ?? []

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{player.nome}</h1>

        {/* Role badges */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          {roles.map((r) => (
            <span key={r} style={{
              background: 'var(--accent)',
              color: '#000',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}>
              {r}
            </span>
          ))}
        </div>

        {player.tratto && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', fontStyle: 'italic' }}>
            {player.tratto}
          </p>
        )}
      </motion.div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        {([
          ['GCP', stats.gcp !== null ? stats.gcp.toFixed(3) : '-'],
          ['Plus/Minus', stats.plus_minus >= 0 ? `+${stats.plus_minus}` : String(stats.plus_minus)],
          ['Media Voto', stats.media_voto !== null ? stats.media_voto.toFixed(2) : '-'],
          ['Presenze', String(stats.presenze)],
        ] as const).map(([label, value]) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>
              {label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
              {value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Streak indicator */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
          Ultime 5 partite
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {streak.map((r, i) => (
            <span key={i} style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: streakColors[r] ?? '#555',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#000',
            }}>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* ER vs Voto trend chart */}
      {trend.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.75rem' }}>
            Andamento ER vs Voto
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend.map((t) => ({ giornata: `G${t.giornata}`, ER: t.er, Voto: t.voto }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="giornata" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} domain={[0, 10]} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: '0.85rem' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="ER" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Voto" stroke="#ff3333" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
