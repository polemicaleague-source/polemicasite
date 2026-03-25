import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { NewsItem } from '../api/news'

export function NewsCard({ item, idx, isOpen, onToggle }: { item: NewsItem; idx: number; isOpen: boolean; onToggle: () => void }) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)

  const checkClamp = useCallback(() => {
    const el = textRef.current
    if (el && !isOpen) setIsClamped(el.scrollHeight > el.clientHeight)
  }, [isOpen])

  useEffect(checkClamp, [checkClamp])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      onClick={isClamped || isOpen ? onToggle : undefined}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
        marginBottom: '0.75rem',
        cursor: isClamped || isOpen ? 'pointer' : 'default',
      }}
    >
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
        {item.titolo}
      </h3>
      <p
        ref={textRef}
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          ...(isOpen ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }),
        }}
      >
        {item.corpo}
      </p>
      {(isClamped || isOpen) && (
        <span style={{
          color: 'var(--accent)',
          fontSize: '0.75rem',
          fontWeight: 600,
          marginTop: '0.4rem',
          display: 'inline-block',
        }}>
          {isOpen ? 'Chiudi' : 'Leggi tutto'}
        </span>
      )}
    </motion.div>
  )
}
