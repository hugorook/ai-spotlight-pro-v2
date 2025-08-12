import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: '#000', 
          color: '#fff', 
          padding: '20px',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ color: '#ff4444' }}>Something went wrong!</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Error Details (click to expand)</summary>
            <div style={{ background: '#222', padding: '15px', borderRadius: '5px' }}>
              <p><strong>Error:</strong> {this.state.error?.message}</p>
              <p><strong>Stack:</strong> {this.state.error?.stack}</p>
              <p><strong>Component Stack:</strong> {this.state.errorInfo?.componentStack}</p>
            </div>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;