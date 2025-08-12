import React from 'react';

const TestCleanPage = () => {
  return (
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
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>✅ Test Clean Page Working!</h1>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>This page uses only inline styles and no shadcn/ui components.</p>
      <button
        onClick={() => window.location.href = '/dashboard'}
        style={{
          background: '#007bff',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default TestCleanPage;