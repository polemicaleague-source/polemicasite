import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import logo from '../resources/logo.jpeg'

export function Layout() {
  return (
    <div style={{
      maxWidth: 'var(--max-width)',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '5rem',
      minHeight: '100dvh',
    }}>
      <Outlet />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1rem 1rem',
        color: '#555',
        fontSize: '0.65rem',
        lineHeight: 1.6,
      }}>
        <img src={logo} alt="PL" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', marginBottom: '0.3rem' }} />
        <div style={{ fontWeight: 600 }}>Polemica League · Stagione 2025/2026</div>
        <div style={{ fontStyle: 'italic', marginTop: '0.15rem' }}>Mai schiavi della campanella</div>
      </footer>

      <BottomNav />
    </div>
  )
}
