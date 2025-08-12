import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const MinimalDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple timeout to simulate data loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#111', 
        color: '#fff', 
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#111', 
      color: '#fff', 
      padding: '20px' 
    }}>
      <h1 style={{ marginBottom: '20px' }}>Minimal Dashboard</h1>
      
      <div style={{ 
        background: '#222', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h2>User Information:</h2>
        <p>Email: {user?.email || 'No email'}</p>
        <p>ID: {user?.id || 'No ID'}</p>
        <p>Authenticated: {user ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ 
        background: '#222', 
        padding: '20px', 
        borderRadius: '8px' 
      }}>
        <h2>Dashboard Content</h2>
        <p>This is a minimal dashboard without any complex UI components.</p>
        <p>If you can see this, the issue is with UI component imports.</p>
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => window.location.href = '/dashboard-steps'}
            style={{
              background: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            Go to Step-by-Step Debug
          </button>
          
          <button 
            onClick={() => window.location.href = '/geo'}
            style={{
              background: '#28a745',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Try GEO Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinimalDashboard;