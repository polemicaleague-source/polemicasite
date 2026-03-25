import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNews, type NewsItem } from '../api/news'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'
import { NewsCard } from '../components/NewsCard'
import logo from '../resources/logo.jpeg'

export function Home() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [partiteCount, setPartiteCount] = useState<number | null>(null)
  const [giocatoriCount, setGiocatoriCount] = useState<number | null>(null)
  const [prossimaPartita, setProssimaPartita] = useState<{ data: string; ora: string; luogo: string; nome: string } | null>(null)
  const [igPosts, setIgPosts] = useState<string[]>([])
  const [ultimaPartita, setUltimaPartita] = useState<{
    giornata: number; data: string; campo: string | null; ora: string | null;
    golA: number; golB: number;
    teamA: { player_id: string; nome: string; gol: number }[];
    teamB: { player_id: string; nome: string; gol: number }[];
  } | null>(null)
  const polemiche = useMemo(() => Math.floor(Math.random() * 900) + 100, [])
  const navigate = useNavigate()

  useEffect(() => {
    getNews()
      .then(setNews)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))

    supabase.from('match_details').select('giornata').order('giornata', { ascending: false }).limit(1).single().then(({ data }) => {
      if (data) setPartiteCount(data.giornata)
    })
    supabase.from('players').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) setGiocatoriCount(count)
    })
    supabase.from('home_widgets').select('tipo, attivo, payload').in('tipo', ['prossima_partita', 'instagram']).then(({ data: widgets }) => {
      for (const w of widgets ?? []) {
        if (w.tipo === 'prossima_partita' && w.attivo) setProssimaPartita(w.payload as any)
        if (w.tipo === 'instagram' && w.attivo) {
          const posts = ((w.payload as any)?.posts ?? []).filter((u: string) => u.trim())
          if (posts.length > 0) setIgPosts(posts)
        }
      }
    })

    // Fetch ultima partita
    supabase.from('match_details')
      .select('giornata, data, campo, ora, squadra, gol_squadra, gol, player_id, players(id, nome)')
      .order('giornata', { ascending: false })
      .then(({ data: md }) => {
        if (!md || md.length === 0) return
        const maxG = (md as any[])[0].giornata
        const rows = (md as any[]).filter((r: any) => r.giornata === maxG)
        let golA = 0, golB = 0
        const teamA: { player_id: string; nome: string; gol: number }[] = []
        const teamB: { player_id: string; nome: string; gol: number }[] = []
        for (const r of rows) {
          if (r.squadra === 'A') {
            if (golA === 0) golA = r.gol_squadra
            teamA.push({ player_id: r.player_id, nome: r.players?.nome ?? '??', gol: r.gol })
          } else {
            if (golB === 0) golB = r.gol_squadra
            teamB.push({ player_id: r.player_id, nome: r.players?.nome ?? '??', gol: r.gol })
          }
        }
        setUltimaPartita({
          giornata: maxG, data: rows[0].data, campo: rows[0].campo, ora: rows[0].ora,
          golA, golB, teamA, teamB,
        })
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

      {/* Prossima Partita banner */}
      {prossimaPartita && prossimaPartita.data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'linear-gradient(135deg, #2d2b6b 0%, #4a3f9f 100%)',
            borderRadius: 'var(--radius)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '0.1rem',
          }}>
            <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
              Prossima Partita
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              {new Date(prossimaPartita.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {prossimaPartita.ora && (
                <span> — ore <span style={{ color: 'var(--accent)' }}>{prossimaPartita.ora.slice(0, 5)}</span></span>
              )}
            </div>
            {prossimaPartita.luogo && (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.2rem' }}>
                📍 {prossimaPartita.luogo}
              </div>
            )}
            {prossimaPartita.nome && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--accent)',
              }}>
                {prossimaPartita.nome}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Ultima Partita banner */}
      {ultimaPartita && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1rem' }}>⚽</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Ultima partita</span>
          </div>

          <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '0.75rem',
          }}>
            Giornata {ultimaPartita.giornata} · {new Date(ultimaPartita.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {ultimaPartita.campo && ` · ${ultimaPartita.campo}`}
            {ultimaPartita.ora && ` · ore ${ultimaPartita.ora.slice(0, 5)}`}
          </div>

          {/* Score */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '1rem',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: ultimaPartita.golA > ultimaPartita.golB ? 'var(--accent)' : 'var(--text-secondary)',
                marginBottom: '0.2rem',
              }}>
                Squadra A {ultimaPartita.golA > ultimaPartita.golB ? '🏆' : ''}
              </div>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '2px',
            }}>
              <span style={{ color: ultimaPartita.golA > ultimaPartita.golB ? 'var(--accent)' : 'var(--text-secondary)' }}>{ultimaPartita.golA}</span>
              <span style={{ color: '#555', margin: '0 0.3rem' }}>-</span>
              <span style={{ color: ultimaPartita.golB > ultimaPartita.golA ? 'var(--accent)' : 'var(--text-secondary)' }}>{ultimaPartita.golB}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: ultimaPartita.golB > ultimaPartita.golA ? 'var(--accent)' : 'var(--text-secondary)',
                marginBottom: '0.2rem',
              }}>
                Squadra B {ultimaPartita.golB > ultimaPartita.golA ? '🏆' : ''}
              </div>
            </div>
          </div>

          {/* Teams */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Team A - aligned right */}
            <div style={{ flex: 1, textAlign: 'right' }}>
              {ultimaPartita.teamA.map((p) => (
                <div
                  key={p.player_id}
                  onClick={() => navigate(`/profilo/${p.player_id}`)}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.25rem 0',
                    color: ultimaPartita.golA > ultimaPartita.golB ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.gol > 0 && (
                    <span style={{ marginRight: '0.3rem' }}>{'⚽'.repeat(p.gol)}</span>
                  )}
                  {p.nome}
                </div>
              ))}
            </div>
            {/* Team B - aligned left */}
            <div style={{ flex: 1 }}>
              {ultimaPartita.teamB.map((p) => (
                <div
                  key={p.player_id}
                  onClick={() => navigate(`/profilo/${p.player_id}`)}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.25rem 0',
                    color: ultimaPartita.golB > ultimaPartita.golA ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.nome}
                  {p.gol > 0 && (
                    <span style={{ marginLeft: '0.3rem' }}>{'⚽'.repeat(p.gol)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Instagram section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ marginBottom: '1.5rem' }}
      >
        <a
          href="https://www.instagram.com/polemicaleague/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
            borderRadius: 'var(--radius)',
            padding: '0.75rem 1rem',
            textDecoration: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          Seguici su Instagram
        </a>

        {igPosts.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '0.75rem',
          }}>
            {igPosts.map((url, i) => {
              const embedUrl = url.replace(/\/?(\?.*)?$/, '/embed')
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    background: '#000',
                  }}
                >
                  <iframe
                    src={embedUrl}
                    style={{
                      width: '100%',
                      minHeight: 480,
                      border: 'none',
                    }}
                    allowTransparency
                    scrolling="no"
                  />
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {loading && <Skeleton height="5rem" count={4} />}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <AnimatePresence>
        {giornate.slice(0, 1).map((g) => (
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
                <NewsCard key={item.id} item={item} idx={idx} isOpen={isOpen} onToggle={toggle} />
              )
            })}
          </div>
        ))}
      </AnimatePresence>

      {!loading && giornate.length > 1 && (
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
