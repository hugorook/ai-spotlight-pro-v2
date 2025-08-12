import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('SafeErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          minHeight: '100vh',
          background: '#111',
          color: '#fff',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#ff6b6b' }}>
            ⚠️ Page Error
          </h1>
          <p style={{ fontSize: '16px', marginBottom: '20px', textAlign: 'center' }}>
            This page encountered a loading error. This is likely due to a component initialization issue.
          </p>
          <div style={{ 
            background: '#222', 
            padding: '15px', 
            borderRadius: '6px', 
            marginBottom: '20px',
            fontSize: '14px',
            fontFamily: 'monospace',
            maxWidth: '600px',
            overflow: 'auto'
          }}>
            <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              style={{
                background: '#007bff',
                color: 'white',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🏠 Back to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#28a745',
                color: 'white',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeErrorBoundary;