import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNews, type NewsItem } from '../api/news'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'
import logo from '../resources/logo.jpeg'

export function Home() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [partiteCount, setPartiteCount] = useState<number | null>(null)
  const [giocatoriCount, setGiocatoriCount] = useState<number | null>(null)
  const polemiche = useMemo(() => Math.floor(Math.random() * 900) + 100, [])

  useEffect(() => {
    getNews()
      .then(setNews)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))

    supabase.from('match_details').select('giornata', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) setPartiteCount(count)
    })
    supabase.from('players').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) setGiocatoriCount(count)
    })
  }, [])

  // Group by giornata
  const grouped = news.reduce<Record<number, NewsItem[]>>((acc, item) => {
    ;(acc[item.giornata] ??= []).push(item)
    return acc
  }, {})
  const giornate = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <div style={{ padding: '1rem' }}>
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '1.5rem 1rem',
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
        }}
      >
        <img
          src={logo}
          alt="Polemica League"
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            objectFit: 'cover',
            marginBottom: '0.75rem',
          }}
        />
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.2rem' }}>
          <span style={{ color: 'var(--accent)' }}>Polemica</span> League
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1rem' }}>
          Stagione 2025/2026
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          {partiteCount !== null && <span><span style={{ color: 'var(--accent)' }}>{partiteCount}</span> partite giocate</span>}
          {partiteCount !== null && giocatoriCount !== null && <span>·</span>}
          {giocatoriCount !== null && <span><span style={{ color: 'var(--accent)' }}>{giocatoriCount}</span> giocatori</span>}
          <span>·</span>
          <span><span style={{ color: 'var(--accent)' }}>{polemiche}</span> polemiche</span>
        </div>
      </motion.div>

      {loading && <Skeleton height="5rem" count={4} />}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <AnimatePresence>
        {giornate.slice(0, 3).map((g) => (
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

      {!loading && giornate.length > 3 && (
        <Link
          to="/news"
          style={{
            display: 'block',
            textAlign: 'center',
            color: 'var(--accent)',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textDecoration: 'none',
          }}
        >
          Vai all'archivio news →
        </Link>
      )}

      {!loading && news.length === 0 && !error && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '3rem' }}>
          Nessuna news disponibile
        </p>
      )}
    </div>
  )
}
