import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getClassifiche } from '../api/classifiche'
import type { ClassificaRow } from '../lib/schemas'
import { Skeleton } from '../components/Skeleton'

type Tab = 'marcatori' | 'assist' | 'voto'

const TABS: { key: Tab; label: string }[] = [
  { key: 'marcatori', label: 'Marcatori' },
  { key: 'assist', label: 'Assist' },
  { key: 'voto', label: 'Media Voto' },
]

function valueForTab(row: ClassificaRow, tab: Tab): string {
  if (tab === 'marcatori') return String(row.gol_totali)
  if (tab === 'assist') return String(row.assist_totali)
  return row.media_voto !== null ? row.media_voto.toFixed(2) : '-'
}

const streakColors: Record<string, string> = { V: '#22c55e', P: '#eab308', S: '#ef4444' }

export function Stats() {
  const [tab, setTab] = useState<Tab>('marcatori')
  const [rows, setRows] = useState<ClassificaRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getClassifiche(tab)
      .then((res) => setRows(res.data))
      .catch(() => setRows([]))
      .then(() => setLoading(false))
  }, [tab])

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Stats</h1>

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.25rem',
      }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              background: tab === key ? 'var(--accent)' : 'var(--surface)',
              color: tab === key ? '#000' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Skeleton height="3rem" count={8} />}

      {!loading && rows.map((row, idx) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
        >
          <Link
            to={`/profilo/${row.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {/* Rank */}
            <span style={{
              width: '2rem',
              fontWeight: 700,
              color: idx < 3 ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '1.1rem',
            }}>
              {idx + 1}
            </span>

            {/* Name */}
            <span style={{ flex: 1, fontWeight: 500 }}>{row.nome}</span>

            {/* Streak pills */}
            <div style={{ display: 'flex', gap: '3px', marginRight: '0.75rem' }}>
              {row.last_5.map((r, i) => (
                <span key={i} style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: streakColors[r] ?? '#555',
                }} />
              ))}
            </div>

            {/* Value */}
            <span style={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: 'var(--accent)',
              minWidth: '3.5rem',
              textAlign: 'right',
            }}>
              {valueForTab(row, tab)}
            </span>
          </Link>
        </motion.div>
      ))}

      {!loading && rows.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '3rem' }}>
          Nessun dato disponibile
        </p>
      )}
    </div>
  )
}
