import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'

interface PlayerListItem {
  id: string
  nome: string
  avatar_url: string | null
}

const PAGE_SIZE = 15

export function Giocatori() {
  const [players, setPlayers] = useState<PlayerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')

  const loadPage = async (offset: number) => {
    const { data, error } = await supabase
      .from('players')
      .select('id, nome, avatar_url')
      .order('nome')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) return []
    if (!data || data.length < PAGE_SIZE) setHasMore(false)
    return data ?? []
  }

  useEffect(() => {
    loadPage(0)
      .then(setPlayers)
      .finally(() => setLoading(false))
  }, [])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    const more = await loadPage(players.length)
    setPlayers((prev) => [...prev, ...more])
    setLoadingMore(false)
  }

  const filtered = search.trim()
    ? players.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()))
    : players

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Giocatori</h1>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Link
          to="/stats"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            border: '1px solid #333',
            color: 'var(--accent)',
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Stats
        </Link>
        <Link
          to="/1vs1"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            border: '1px solid #333',
            color: 'var(--accent)',
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          1 vs 1
        </Link>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <svg width="18" height="18" fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Cerca giocatore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 0.75rem 0.65rem 2.5rem',
            borderRadius: '8px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid #333',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {loading && <Skeleton height="4rem" count={8} />}

      {filtered.map((p, idx) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.02 }}
        >
          <Link
            to={`/profilo/${p.id}`}
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
            {/* Avatar */}
            {p.avatar_url ? (
              <img
                src={p.avatar_url}
                alt={p.nome}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginRight: '0.75rem',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '0.75rem',
                flexShrink: 0,
                color: 'var(--text-secondary)',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}>
                {p.nome.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name */}
            <span style={{ flex: 1, fontWeight: 500, fontSize: '1rem' }}>{p.nome}</span>

            {/* Arrow */}
            <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </motion.div>
      ))}

      {hasMore && !loading && !search.trim() && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.75rem',
            marginTop: '0.5rem',
            borderRadius: '8px',
            background: 'var(--surface)',
            color: 'var(--accent)',
            fontWeight: 600,
            fontSize: '0.9rem',
            opacity: loadingMore ? 0.6 : 1,
          }}
        >
          {loadingMore ? 'Caricamento...' : 'Carica altri'}
        </button>
      )}

      {!loading && filtered.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '3rem' }}>
          Nessun giocatore disponibile
        </p>
      )}
    </div>
  )
}
