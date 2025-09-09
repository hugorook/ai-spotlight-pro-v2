import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EnhancedSidebar from '@/components/layout/EnhancedSidebar';

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
    return (
      <div className="min-h-screen bg-[#ece7e0]">
        <EnhancedSidebar />
        <div className="lg:pl-[12.5rem] px-6 py-6">
          <div className="text-center py-12">
            <p className="text-[#3d3d38]">Please sign in to access settings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ece7e0]">
      <EnhancedSidebar />
      <div className="lg:pl-[12.5rem] px-6 py-6">
        <div className="space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-corben text-[#282823] text-3xl mb-1" style={{fontWeight: 400}}>Settings</h1>
          <p className="text-[12px] text-[#3d3d38]">
            Manage your account and data preferences
          </p>
        </div>

        {/* Data Management Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
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
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
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
      </div>
    </div>
  );
};

export default SettingsPage;