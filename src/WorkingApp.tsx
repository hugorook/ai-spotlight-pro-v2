import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

console.log('WorkingApp: Loading');

const WorkingApp = () => {
  console.log('WorkingApp: Rendering');
  
  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* Simple Navigation */}
        <nav style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🚀 AI Spotlight Pro</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>Step 1: Basic routing established</p>
        </nav>

        {/* Main Content Area */}
        <main style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/geo" element={<GeoPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '20px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p>✅ React Router working • ✅ Navigation working • ⏳ Adding features step by step</p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

// Simple page components with inline styles
const HomePage = () => (
  <div>
    <h2 style={{ fontSize: '48px', margin: '20px 0' }}>🏠</h2>
    <h3>Welcome to AI Spotlight Pro</h3>
    <p>This is the home page. Navigation is working!</p>
    <div style={{ marginTop: '30px' }}>
      <a href="/auth" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>
        → Go to Authentication
      </a>
    </div>
  </div>
);

const AuthPage = () => (
  <div>
    <h2 style={{ fontSize: '48px', margin: '20px 0' }}>🔐</h2>
    <h3>Authentication Page</h3>
    <p>This will be the login page. Currently just a placeholder.</p>
    <div style={{ marginTop: '30px' }}>
      <a href="/dashboard" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>
        → Go to Dashboard (Skip auth for now)
      </a>
    </div>
  </div>
);

const DashboardPage = () => (
  <div>
    <h2 style={{ fontSize: '48px', margin: '20px 0' }}>📊</h2>
    <h3>Dashboard Page</h3>
    <p>This will show company data and analytics.</p>
    <div style={{ marginTop: '30px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
      <a href="/geo" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>→ GEO</a>
      <a href="/competitors" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>→ Competitors</a>
      <a href="/content" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>→ Content</a>
    </div>
  </div>
);

const GeoPage = () => (
  <div>
    <h2 style={{ fontSize: '48px', margin: '20px 0' }}>🌍</h2>
    <h3>GEO Page</h3>
    <p>This will show geographic AI mentions and visibility.</p>
    <div style={{ marginTop: '30px' }}>
      <a href="/dashboard" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>
        ← Back to Dashboard
      </a>
    </div>
  </div>
);

const CompetitorsPage = () => (
  <div>
    <h2 style={{ fontSize: '48px', margin: '20px 0' }}>⚔️</h2>
    <h3>Competitors Page</h3>
    <p>This will show competitor analysis and comparisons.</p>
    <div style={{ marginTop: '30px' }}>
      <a href="/dashboard" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>
        ← Back to Dashboard
      </a>
    </div>
  </div>
);

const ContentPage = () => (
  <div>
    <h2 style={{ fontSize: '48px', margin: '20px 0' }}>📝</h2>
    <h3>Content Page</h3>
    <p>This will show content optimization and AI visibility.</p>
    <div style={{ marginTop: '30px' }}>
      <a href="/dashboard" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '18px' }}>
        ← Back to Dashboard
      </a>
    </div>
  </div>
);

console.log('WorkingApp: Component defined');

export default WorkingApp;