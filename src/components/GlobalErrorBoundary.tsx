import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../lib/errorLogger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our Firestore database
    logError('React Error Boundary', error);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#121212] text-white p-6 text-center">
          <h1 className="text-3xl font-bold mb-4 text-zinc-100">Something went wrong.</h1>
          <p className="text-zinc-400 mb-8 max-w-md">Our engineering team has been notified. We apologize for the inconvenience.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#22c55e] text-zinc-950 font-bold rounded-lg hover:bg-[#22c55e]/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
