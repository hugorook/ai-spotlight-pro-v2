import React from 'react';

const DebugTest = () => {
  console.log('DebugTest: Component rendering');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'red',
      color: 'white',
      padding: '20px',
      fontSize: '24px'
    }}>
      <h1>🔍 DEBUG TEST PAGE WORKING</h1>
      <p>If you can see this, basic React components work.</p>
      <p>Timestamp: {new Date().toLocaleString()}</p>
    </div>
  );
};

console.log('DebugTest: Component defined');

export default DebugTest;