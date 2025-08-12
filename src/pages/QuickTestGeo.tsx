import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/MinimalAuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/types/supabase';
import CleanAppHeader from '@/components/CleanAppHeader';

type Company = Tables<'companies'>;

export default function QuickTestGeo() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCompanyData = useCallback(async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error loading company:', error);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user, loadCompanyData]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#fff', padding: '20px' }}>
        <CleanAppHeader />
        <div style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '18px' }}>Loading Your GEO...</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#fff', padding: '20px' }}>
        <CleanAppHeader />
        <div style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️ No Company Profile Found</div>
          <div style={{ fontSize: '16px', marginBottom: '30px', color: '#888' }}>
            You need to set up your company profile to start using AI Visibility testing and analysis.
          </div>
          <button
            onClick={() => alert('Company setup would appear here')}
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
            Set Up Company Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111', color: '#fff' }}>
      <CleanAppHeader />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ 
          borderBottom: '1px solid #333',
          paddingBottom: '20px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '32px' }}>Your GEO</h1>
            <p style={{ margin: 0, color: '#888', fontSize: '16px' }}>AI Visibility Optimization</p>
          </div>
          <div style={{
            background: '#333',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #555'
          }}>
            📈 Health Score: 0/100
          </div>
        </div>

        {/* Company Info */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>Company Profile</h2>
          <div style={{ marginBottom: '10px' }}>
            <strong>{company.company_name}</strong>
          </div>
          <div style={{ color: '#888', marginBottom: '10px' }}>
            🌐 {company.website_url}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{
              background: '#333',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {company.industry}
            </span>
          </div>
          <div style={{ marginBottom: '10px', color: '#ccc' }}>
            {company.description}
          </div>
        </div>

        {/* Health Check Section */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>AI Visibility Health Check</h2>
          <p style={{ margin: '0 0 20px 0', color: '#888' }}>
            Test how your company appears across 25+ AI-generated responses
          </p>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button 
              onClick={() => alert('Health check would start here')}
              style={{
                background: '#28a745',
                color: 'white',
                padding: '16px 32px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                maxWidth: '400px',
                width: '100%'
              }}
            >
              ▶️ Run Automated Health Check
            </button>
          </div>
          
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🧪</div>
            <p style={{ margin: '0 0 5px 0' }}>No test results yet</p>
            <p style={{ margin: 0, fontSize: '12px' }}>Run your first AI visibility test to see results here</p>
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          marginTop: '40px',
          padding: '20px 0',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: '#6c757d',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🏠 Dashboard
          </button>
          <button
            onClick={() => window.location.href = '/competitors'}
            style={{
              background: '#28a745',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🏆 Competitor Analysis
          </button>
          <button
            onClick={() => window.location.href = '/content'}
            style={{
              background: '#6f42c1',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✍️ Content Assistant
          </button>
        </div>
      </div>
    </div>
  );
}