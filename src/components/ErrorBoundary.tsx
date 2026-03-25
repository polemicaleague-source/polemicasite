import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff3333' }}>
          <h2>Qualcosa è andato storto</h2>
          <p style={{ color: '#aaa', marginTop: '0.5rem' }}>{this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}
