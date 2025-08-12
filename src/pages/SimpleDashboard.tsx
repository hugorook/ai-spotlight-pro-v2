import { useAuth } from "@/contexts/AuthContext";

const SimpleDashboard = () => {
  const { user } = useAuth();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000', 
      color: '#fff', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Simple Dashboard Test</h1>
      
      <div style={{ background: '#333', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h2>User Information:</h2>
        <p>User ID: {user?.id || 'No user'}</p>
        <p>Email: {user?.email || 'No email'}</p>
        <p>User exists: {user ? 'Yes' : 'No'}</p>
      </div>
      
      <div style={{ background: '#333', padding: '15px', borderRadius: '5px' }}>
        <h2>Navigation:</h2>
        <button 
          onClick={() => window.location.href = '/debug'}
          style={{ 
            background: '#007bff', 
            color: 'white', 
            padding: '10px 15px', 
            border: 'none', 
            borderRadius: '3px',
            margin: '5px',
            cursor: 'pointer'
          }}
        >
          Go to Debug Page
        </button>
        
        <button 
          onClick={() => window.location.href = '/dashboard'}
          style={{ 
            background: '#28a745', 
            color: 'white', 
            padding: '10px 15px', 
            border: 'none', 
            borderRadius: '3px',
            margin: '5px',
            cursor: 'pointer'
          }}
        >
          Try Real Dashboard
        </button>
        
        <button 
          onClick={() => window.location.href = '/geo'}
          style={{ 
            background: '#ffc107', 
            color: 'black', 
            padding: '10px 15px', 
            border: 'none', 
            borderRadius: '3px',
            margin: '5px',
            cursor: 'pointer'
          }}
        >
          Go to GEO Page
        </button>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        Timestamp: {new Date().toISOString()}
      </div>
    </div>
  );
};

export default SimpleDashboard;