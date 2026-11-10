import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

/** Shows what went wrong instead of leaving a blank screen, so a crash can be reported precisely. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error) { console.error('Folio crashed:', error) }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const details = `${error.name}: ${error.message}\n\n${error.stack ?? ''}`.slice(0, 3000)
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: 'var(--ink, #1d1c1a)' }}>
        <h1 style={{ fontSize: 22, margin: '24px 0 8px' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 16px', color: 'var(--muted, #6c6a65)' }}>
          Folio hit a problem on this screen. Your saved files are safe. Take a screenshot of the details below if you need to report it.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, padding: 12, borderRadius: 8, background: 'rgba(127,127,127,.12)', maxHeight: 280, overflow: 'auto' }}>{details}</pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn primary" onClick={() => location.reload()}>Restart Folio</button>
          <button className="btn quiet" onClick={() => { try { navigator.clipboard.writeText(details) } catch { /* ignore */ } }}>Copy details</button>
        </div>
      </div>
    )
  }
}
