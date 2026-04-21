import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureAnalyticsError } from '~/lib/analytics';

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives the thrown error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level React error boundary. React Router's per-route `errorElement`
 * only catches errors during routing — component render errors inside a
 * route still crash the tree without this wrapper.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[errorBoundary]', error, info.componentStack);
    captureAnalyticsError(error, { componentStack: info.componentStack });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} onReset={this.reset} />;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'var(--surface, #fafafa)',
        color: 'var(--fg-base, #111)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted, #666)', fontSize: 15 }}>
          The app ran into an unexpected error. You can try again, or reload the page.
        </p>
        <pre
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 12,
            background: 'var(--surface-muted, #f0f0f0)',
            color: 'var(--fg-muted, #666)',
            padding: '10px 14px',
            borderRadius: 'var(--r-10, 10px)',
            maxWidth: '100%',
            overflow: 'auto',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}
        >
          {error.message}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--ring-border, #d0d0d0)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--fg-base, #111)',
              background: 'var(--fg-base, #111)',
              color: 'var(--bg-base, #fff)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
