import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-4 p-4 rounded-md bg-muted text-sm font-mono overflow-auto">
                <summary className="cursor-pointer font-semibold text-destructive mb-2">
                  Error details (dev only)
                </summary>
                <div className="text-destructive whitespace-pre-wrap">
                  {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div className="mt-2 text-muted-foreground whitespace-pre-wrap text-xs">
                    {this.state.error.stack}
                  </div>
                )}
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
