import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';

interface Props {
  children?: ReactNode;
  isAdmin?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Check if it's a chunk load error
    if (
      error.name === 'ChunkLoadError' ||
      (error.message && error.message.includes('Loading chunk')) ||
      (error.message && error.message.includes('dynamically imported module'))
    ) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
          window.location.reload();
        }).catch(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
      return;
    }
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-zinc-400 p-4 text-center">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Something went wrong.</h2>
          <p className="mb-4">We encountered an unexpected error. Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#22c55e] text-zinc-950 font-bold rounded-lg hover:bg-[#22c55e]/90 transition-colors"
          >
            Refresh Page
          </button>

          {this.props.isAdmin && this.state.error && (
            <div className="mt-8 p-4 bg-red-950/50 border border-red-900 rounded-lg text-left max-w-4xl w-full overflow-auto">
              <h3 className="text-red-500 font-bold mb-2">Admin Error Details:</h3>
              <p className="text-red-400 font-mono text-sm mb-4">{this.state.error.toString()}</p>
              <pre className="text-red-300/80 font-mono text-xs whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  return <ErrorBoundary isAdmin={isAdmin}>{children}</ErrorBoundary>;
}
