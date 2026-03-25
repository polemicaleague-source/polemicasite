import { NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'

const sections = [
  { to: '/admin/home', label: 'Home' },
  { to: '/admin/partite', label: 'Partite' },
  { to: '/admin/giocatori', label: 'Giocatori' },
  { to: '/admin/news', label: 'News' },
  { to: '/admin/manifesto', label: 'Manifesto' },
  { to: '/admin/rivalita', label: 'Rivalità' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  const { signOut } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 199,
          }}
        />
      )}

      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid #333',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        transform: open ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s ease',
        // Desktop: always visible, Mobile: hidden by default
        ...(typeof window !== 'undefined' && window.innerWidth < 768
          ? { transform: open ? 'translateX(0)' : 'translateX(-100%)' }
          : {}),
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem' }}>
          <span style={{ color: 'var(--accent)' }}>PL</span> Admin
        </h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {sections.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'block',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive ? '#000' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={signOut}
          style={{
            padding: '0.6rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            textTransform: 'uppercase',
            marginTop: '1rem',
          }}
        >
          Logout
        </button>
      </aside>
    </>
  )
}
