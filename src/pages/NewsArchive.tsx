import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNews, type NewsItem } from '../api/news'
import { Skeleton } from '../components/Skeleton'

export function NewsArchive() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    getNews()
      .then(setNews)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const grouped = news.reduce<Record<number, NewsItem[]>>((acc, item) => {
    ;(acc[item.giornata] ??= []).push(item)
    return acc
  }, {})
  const giornate = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.2rem' }}>←</Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Archivio News</h1>
      </div>

      {loading && <Skeleton height="5rem" count={4} />}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <AnimatePresence>
        {giornate.map((g) => (
          <div key={g} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: '#000',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
            }}>
              Giornata {g}
            </div>

            {grouped[g].map((item, idx) => {
              const isOpen = expanded.has(item.id)
              const toggle = () => setExpanded(prev => {
                const next = new Set(prev)
                if (next.has(item.id)) next.delete(item.id)
                else next.add(item.id)
                return next
              })
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={toggle}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    {item.titolo}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    ...(isOpen ? {} : {
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }),
                  }}>
                    {item.corpo}
                  </p>
                  <span style={{
                    color: 'var(--accent)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginTop: '0.4rem',
                    display: 'inline-block',
                  }}>
                    {isOpen ? 'Chiudi' : 'Leggi tutto'}
                  </span>
                </motion.div>
              )
            })}
          </div>
        ))}
      </AnimatePresence>

      {!loading && news.length === 0 && !error && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '3rem' }}>
          Nessuna news disponibile
        </p>
      )}
    </div>
  )
}
