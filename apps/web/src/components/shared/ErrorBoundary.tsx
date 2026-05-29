import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logError } from '@/lib/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error.message, error.stack ?? info.componentStack ?? null, window.location.href);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">💥</div>
            <h1 className="text-xl font-bold text-[var(--color-primary)] mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">{this.state.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
