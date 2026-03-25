import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getPlayerTrend } from '../api/trend'
import type { PlayerTrendResponse, TopPlayer } from '../lib/schemas'
import { Skeleton } from '../components/Skeleton'

const streakColors: Record<string, string> = { V: '#22c55e', P: '#eab308', S: '#ef4444' }

/* ── tiny reusable pieces ─────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.7rem',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      fontWeight: 700,
      letterSpacing: '0.05em',
      marginBottom: '0.6rem',
      paddingBottom: '0.35rem',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {children}
    </div>
  )
}

function StatCell({ label, value, accent, small }: { label: string; value: string | number; accent?: boolean; small?: boolean }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{
        fontSize: small ? '0.6rem' : '0.65rem',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: '0.15rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: small ? '1rem' : '1.25rem',
        fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  )
}

function StatCard({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '0.85rem',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '0.5rem',
      }}
    >
      {children}
    </motion.div>
  )
}

function StreakBadge({ type, value }: { type: 'fire' | 'ice' | 'neutral'; value: number }) {
  if (value === 0) return null
  const config = {
    fire: { icon: '\u{1F525}', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
    ice: { icon: '\u{2744}\u{FE0F}', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
    neutral: { icon: '\u{26A1}', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)' },
  }[type]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.15rem 0.5rem',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 700,
      background: config.bg,
      border: `1px solid ${config.border}`,
    }}>
      {config.icon} {value}
    </span>
  )
}

function TopPlayerCard({ p, labelV, labelS }: { p: TopPlayer; labelV: string; labelS: string }) {
  return (
    <Link to={`/profilo/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '0.7rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.nome}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            {p.partite} partite
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{labelV}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{p.vittorie}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{labelS}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>{p.sconfitte}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── main component ───────────────────────────────────────────── */

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

  const { player, stats, streak, trend, top_compagni, top_avversari } = data
  const roles = player.player_roles?.sort((a, b) => a.ordine - b.ordine).map((r) => r.ruolo) ?? []
  const fmt = (v: number | null, dec = 2) => v !== null ? v.toFixed(dec) : 'ND'
  const fmtPM = (v: number) => v >= 0 ? `+${v}` : String(v)
  const pct = (v: number | null) => v !== null ? `${Math.round(v * 100)}%` : 'ND'

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ═══ HEADER ═══ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Avatar */}
        {player.avatar_url && (
          <img
            src={player.avatar_url}
            alt={player.nome}
            style={{
              width: 90,
              height: 90,
              objectFit: 'cover',
              borderRadius: 'var(--radius)',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{player.nome}</h1>
          {player.soprannome && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.15rem 0 0.35rem' }}>
              &ldquo;{player.soprannome}&rdquo;
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            {roles.map((r) => (
              <span key={r} style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '0.1rem 0.45rem',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}>
                {r}
              </span>
            ))}
          </div>
          {player.tratto && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic', margin: 0 }}>
              {player.tratto}
            </p>
          )}
        </div>
      </motion.div>

      {/* ═══ HERO NUMBERS ═══ */}
      <StatCard cols={4}>
        <StatCell label="Presenze" value={stats.presenze} accent />
        <StatCell label="Vittorie" value={stats.vittorie} accent />
        <StatCell label="Gol" value={stats.gol_totali} accent />
        <StatCell label="Plus/Minus" value={fmtPM(stats.plus_minus)} accent />
      </StatCard>

      {/* ═══ ULTIME 5 PARTITE ═══ */}
      <div>
        <SectionTitle>Ultime 5 partite</SectionTitle>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {streak.map((r, i) => (
            <span key={i} style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: streakColors[r] ?? '#555',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#fff',
            }}>
              {r}
            </span>
          ))}
          {streak.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Nessuna partita</span>}
        </div>
      </div>

      {/* ═══ PRESENZE & ASSENZE ═══ */}
      <div>
        <SectionTitle>Presenze &amp; Assenze</SectionTitle>
        <StatCard cols={4}>
          <StatCell label="Presenze" value={stats.presenze} small />
          <StatCell label="Assenze" value={stats.assenze} small />
          <StatCell label={stats.streak_presenze > 0 ? 'Str. Pres.' : 'Str. Ass.'} value={stats.streak_presenze > 0 ? stats.streak_presenze : stats.streak_assenze} small />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.15rem' }}>Stato</div>
            {stats.streak_presenze > 0
              ? <StreakBadge type="fire" value={stats.streak_presenze} />
              : stats.streak_assenze > 0
                ? <StreakBadge type="ice" value={stats.streak_assenze} />
                : <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>—</span>
            }
          </div>
        </StatCard>
      </div>

      {/* ═══ RISULTATI ═══ */}
      <div>
        <SectionTitle>Risultati</SectionTitle>
        <StatCard cols={4}>
          <StatCell label="Vittorie" value={stats.vittorie} small />
          <StatCell label="Pareggi" value={stats.pareggi} small />
          <StatCell label="Sconfitte" value={stats.sconfitte} small />
          <StatCell label="Win Rate" value={pct(stats.ratio_vittorie)} small />
        </StatCard>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          {stats.streak_vittorie > 0 && <StreakBadge type="fire" value={stats.streak_vittorie} />}
          {stats.streak_sconfitte > 0 && <StreakBadge type="ice" value={stats.streak_sconfitte} />}
          {stats.streak_vittorie > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>vittorie consecutive</span>
          )}
          {stats.streak_sconfitte > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>sconfitte consecutive</span>
          )}
        </div>
      </div>

      {/* ═══ GOL & ASSIST ═══ */}
      <div>
        <SectionTitle>Gol &amp; Assist</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <StatCard cols={4}>
            <StatCell label="Gol" value={stats.gol_totali} small />
            <StatCell label="Media/P" value={fmt(stats.media_gol)} small />
            <StatCell label="Streak" value={stats.streak_gol} small />
            <StatCell label="Autogol" value={stats.autogol} small />
          </StatCard>
          <StatCard cols={3}>
            <StatCell label="Assist" value={stats.assist_totali} small />
            <StatCell label="Media/P" value={fmt(stats.media_assist)} small />
            <StatCell label="Streak" value={stats.streak_assist} small />
          </StatCard>
        </div>
      </div>

      {/* ═══ RATING ═══ */}
      <div>
        <SectionTitle>Rating</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <StatCard cols={3}>
            <StatCell label="Media Voto" value={fmt(stats.media_voto)} small />
            <StatCell label="On Fire" value={fmt(stats.media_on_fire)} small />
            <StatCell label="Plus/Minus" value={fmtPM(stats.plus_minus)} small />
          </StatCard>
          <StatCard cols={3}>
            <StatCell label="Base Rating" value={fmt(stats.base_rating)} small />
            <StatCell label="Expected" value={fmt(stats.expected_rating)} small />
            <StatCell label="Delta" value={stats.delta_rating !== null ? fmtPM(stats.delta_rating) : 'ND'} small />
          </StatCard>
        </div>
      </div>

      {/* ═══ TOP 3 COMPAGNI ═══ */}
      {top_compagni.length > 0 && (
        <div>
          <SectionTitle>Top 3 Compagni</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {top_compagni.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <TopPlayerCard p={p} labelV="V" labelS="S" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TOP 3 AVVERSARI ═══ */}
      {top_avversari.length > 0 && (
        <div>
          <SectionTitle>Top 3 Avversari</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {top_avversari.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <TopPlayerCard p={p} labelV="Le mie V" labelS="Le sue V" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ANDAMENTO CHART ═══ */}
      {trend.length > 0 && (
        <div>
          <SectionTitle>Andamento ER vs Voto</SectionTitle>
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
