import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

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
      <BottomNav />
    </div>
  )
}
