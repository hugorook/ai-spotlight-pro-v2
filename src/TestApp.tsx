import React from 'react';

console.log('TestApp: Loading');

const TestApp = () => {
  console.log('TestApp: Rendering');
  
  return React.createElement('div', {
    style: {
      minHeight: '100vh',
      background: 'lime',
      color: 'black',
      padding: '20px',
      fontSize: '24px',
      fontWeight: 'bold'
    }
  }, [
    React.createElement('h1', { key: 'title' }, '🚀 BASIC REACT IS WORKING!'),
    React.createElement('p', { key: 'time' }, 'Time: ' + new Date().toLocaleString()),
    React.createElement('p', { key: 'test' }, 'If you can see this lime green page, React is loading properly.')
  ]);
};

console.log('TestApp: Component defined');

export default TestApp;