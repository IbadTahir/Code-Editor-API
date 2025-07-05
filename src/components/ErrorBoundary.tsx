import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <div className="p-6 text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                An unexpected error occurred. Our team has been notified.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left bg-gray-100 p-3 rounded-lg mb-4">
                  <summary className="cursor-pointer font-medium text-red-600 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap">
                    {this.state.error.name}: {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        Stack trace:
                        {'\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </details>
              )}
              
              <div className="space-y-3">
                <Button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Reload Page
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
