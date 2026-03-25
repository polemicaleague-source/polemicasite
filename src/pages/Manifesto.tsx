import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getManifesto, type ManifestoArticle } from '../api/news'
import { Skeleton } from '../components/Skeleton'

export function ManifestoPage() {
  const [articles, setArticles] = useState<ManifestoArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getManifesto()
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem' }}>
        Manifesto
      </h1>

      {loading && <Skeleton height="5rem" count={5} />}

      {articles.map((art, idx) => (
        <motion.div
          key={art.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: 'var(--accent)',
              color: '#000',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              Art. {art.articolo}
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              {art.nome_articolo}
            </h3>
          </div>
          {art.corpo && (
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {art.corpo}
            </p>
          )}
        </motion.div>
      ))}

      {!loading && articles.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '3rem' }}>
          Nessun articolo disponibile
        </p>
      )}
    </div>
  )
}
