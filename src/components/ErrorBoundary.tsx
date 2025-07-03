'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui';

// ================================================================
// Types
// ================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ================================================================
// Error Boundary Component
// ================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // TODO: Send error to error reporting service (e.g., Sentry)
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.reset);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-100 mb-2">
                予期しないエラーが発生しました
              </h1>
              
              <p className="text-gray-400 mb-6">
                申し訳ございません。エラーが発生しました。
                <br />
                問題が続く場合は、サポートにお問い合わせください。
              </p>

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-gray-900 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                variant="primary" 
                size="md" 
                className="w-full"
                onClick={this.reset}
              >
                もう一度試す
              </Button>
              
              <Button 
                variant="secondary" 
                size="md" 
                className="w-full"
                onClick={() => window.location.href = '/'}
              >
                ホームに戻る
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ================================================================
// Hook for Error Boundary
// ================================================================

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}