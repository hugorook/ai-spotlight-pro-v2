import React, { useState } from 'react';
import { useAuth } from '@/contexts/MinimalAuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/layout/AppShell';

const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const clearAllData = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      '⚠️ This will permanently delete ALL your test data.\n\n' +
      'This includes:\n' +
      '• All AI visibility test results\n' +
      '• All competitor analysis data\n' +
      '• All dashboard metrics\n\n' +
      'This action cannot be undone. Are you sure?'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm('Are you absolutely sure? This will clear everything.');
    if (!doubleConfirm) return;

    setLoading(true);
    try {
      // Get company ID first
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id);

      if (!companies?.length) {
        alert('No company found');
        return;
      }

      const companyId = companies[0].id;

      // Clear all test data
      const { error, count } = await supabase
        .from('ai_tests')
        .delete()
        .eq('company_id', companyId);

      if (error) {
        console.error('Error clearing data:', error);
        alert(`Failed to clear data: ${error.message}`);
      } else {
        alert(`✅ Successfully cleared all data! (${count || 'unknown'} records deleted)`);
        // Refresh the page to show clean state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please sign in to access settings</div>;
  }

  return (
    <AppShell>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '40px 20px',
        fontFamily: '"Inter", sans-serif'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Settings
          </h1>
          <p style={{ 
            color: '#888', 
            margin: 0,
            fontSize: '16px'
          }}>
            Manage your account and data preferences
          </p>
        </div>

        {/* Data Management Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            color: '#fff'
          }}>
            Data Management
          </h2>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
          }}>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: '#fff'
              }}>
                Clear All Data
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#999',
                margin: 0
              }}>
                Permanently delete all your AI test results and metrics. This action cannot be undone.
              </p>
            </div>
            
            <button
              onClick={clearAllData}
              disabled={loading}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = '#dc2626';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#ef4444';
              }}
            >
              {loading ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            color: '#fff'
          }}>
            Account Information
          </h2>
          
          <div style={{ color: '#ccc' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Email:</strong> {user.email}
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>User ID:</strong> {user.id}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default SettingsPage;