import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '../../components/admin/Sidebar'
import { useAuth } from '../../lib/useAuth'
import { Skeleton } from '../../components/Skeleton'

export function AdminLayout() {
  const { user, loading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/admin/login')
    if (!loading && user && !isAdmin) navigate('/')
  }, [loading, user, isAdmin, navigate])

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton height="2rem" count={5} />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={{
        flex: 1,
        marginLeft: 220,
        padding: '1.5rem 2rem',
        minWidth: 0,
      }}>
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none',
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 150,
            background: 'var(--surface)',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '0.5rem',
            color: 'var(--text-primary)',
          }}
          className="admin-hamburger"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Outlet />
      </main>

      <style>{`
        @media (max-width: 767px) {
          main { margin-left: 0 !important; padding: 1rem !important; padding-top: 3.5rem !important; }
          .admin-hamburger { display: block !important; }
        }
      `}</style>
    </div>
  )
}
