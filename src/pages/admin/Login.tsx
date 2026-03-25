import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../lib/useAuth'
import { supabase } from '../../lib/supabase'

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email, password)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.role !== 'admin') {
        await supabase.auth.signOut()
        toast.error('Accesso riservato agli admin')
        navigate('/')
        return
      }
      toast.success('Login effettuato')
      navigate('/admin/partite')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore di login')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1rem',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '2rem',
        width: '100%',
        maxWidth: 380,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>
          <span style={{ color: 'var(--accent)' }}>Polemica</span> Admin
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '0.75rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '0.75rem' }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: 'var(--accent)',
            color: '#000',
            padding: '0.75rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'uppercase',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Accesso...' : 'Accedi'}
        </button>
      </form>
    </div>
  )
}
