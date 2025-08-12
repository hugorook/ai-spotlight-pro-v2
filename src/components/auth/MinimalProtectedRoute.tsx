import React, { useState } from 'react';
import { useAuth } from '@/contexts/MinimalAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const MinimalAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px'
          }}>
            🧠
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
            {isLogin ? 'Sign in to your AI Visibility Hub' : 'Join AI Visibility Hub'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%',
              background: loading || !email || !password 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '14px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              transform: loading ? 'scale(1)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (!loading && email && password) {
                e.target.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            {loading ? (
              <span>
                {isLogin ? '🔄 Signing In...' : '🔄 Creating Account...'}
              </span>
            ) : (
              <span>
                {isLogin ? '🚀 Sign In' : '✨ Create Account'}
              </span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'none',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            {isLogin ? 
              "Don't have an account? Create one →" : 
              "Already have an account? Sign in →"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

const MinimalLoadingSpinner = () => (
  <div style={{
    minHeight: '100vh',
    background: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '36px',
        animation: 'pulse 2s infinite'
      }}>
        🧠
      </div>
      <div style={{ color: '#fff', fontSize: '18px', fontWeight: '500' }}>
        Loading AI Visibility Hub...
      </div>
      <div style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>
        Preparing your workspace
      </div>
    </div>
  </div>
);

export const MinimalProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  console.log('MinimalProtectedRoute: Rendering with state:', { hasUser: !!user, loading });

  if (loading) {
    console.log('MinimalProtectedRoute: Showing loading spinner');
    return <MinimalLoadingSpinner />;
  }

  if (!user) {
    console.log('MinimalProtectedRoute: No user, showing auth page');
    return <MinimalAuthPage />;
  }

  console.log('MinimalProtectedRoute: User authenticated, showing children');
  return <>{children}</>;
};