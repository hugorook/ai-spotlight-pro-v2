import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="h1 mb-2">Settings</h1>
          <p className="body text-black">
            Manage your account and data preferences
          </p>
        </div>

        {/* Data Management Section */}
        <div className="bg-white/70 backdrop-blur-sm border border-black/20 rounded-xl p-6 shadow-soft">
          <h2 className="h2 mb-4">
            Data Management
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <h3 className="h4 mb-1">
                Clear All Data
              </h3>
              <p className="body text-sm text-gray-600">
                Permanently delete all your AI test results and metrics. This action cannot be undone.
              </p>
            </div>
            
            <button
              onClick={clearAllData}
              disabled={loading}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                loading 
                  ? 'bg-red-300 text-white cursor-not-allowed' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {loading ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white/70 backdrop-blur-sm border border-black/20 rounded-xl p-6 shadow-soft">
          <h2 className="h2 mb-4">
            Account Information
          </h2>
          
          <div className="space-y-2">
            <p className="body">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="body">
              <strong>User ID:</strong> {user.id}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default SettingsPage;