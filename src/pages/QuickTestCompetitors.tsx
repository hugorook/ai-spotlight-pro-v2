import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/MinimalAuthContext";
import type { Tables } from "@/types/supabase";
import CleanAppHeader from "@/components/CleanAppHeader";

type Company = Pick<Tables<'companies'>, 'id' | 'company_name' | 'competitors'>;

const QuickTestCompetitors = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCompetitor, setNewCompetitor] = useState("");

  const loadCompanyData = useCallback(async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, company_name, competitors')
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
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user, loadCompanyData]);

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim() || !company) return;

    try {
      const updatedCompetitors = [...(company.competitors || []), newCompetitor.trim()];

      const { error } = await supabase
        .from('companies')
        .update({ competitors: updatedCompetitors })
        .eq('id', company.id);

      if (error) throw error;

      setCompany(prev => prev ? { ...prev, competitors: updatedCompetitors } : null);
      setNewCompetitor("");
      alert(`${newCompetitor} has been added to your competitor list.`);
    } catch (error) {
      console.error('Error adding competitor:', error);
      alert('Failed to add competitor. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#fff' }}>
        <CleanAppHeader />
        <div style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '18px' }}>Loading Competitor Analysis...</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#fff' }}>
        <CleanAppHeader />
        <div style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️ No Company Profile Found</div>
          <div style={{ fontSize: '16px', marginBottom: '30px', color: '#888' }}>
            You need to set up your company profile first to access competitor analysis.
          </div>
          <button
            onClick={() => window.location.href = '/geo'}
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
        {/* Header */}
        <div style={{
          borderBottom: '1px solid #333',
          paddingBottom: '20px',
          marginBottom: '30px'
        }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '32px' }}>Competitor Positioning</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '16px' }}>
            Analyze how competitors appear in AI responses and identify market opportunities
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          {/* Competitor Management */}
          <div>
            <div style={{
              background: '#222',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #333',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>👥 Manage Competitors</h2>
                <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                  Add and manage your main competitors for analysis
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  placeholder="Competitor name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#333',
                    border: '1px solid #555',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
                <button 
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.trim()}
                  style={{
                    background: newCompetitor.trim() ? '#28a745' : '#666',
                    color: 'white',
                    padding: '10px 15px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: newCompetitor.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  ➕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {company.competitors && company.competitors.length > 0 ? (
                  company.competitors.map((competitor, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#111',
                      borderRadius: '6px'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{competitor}</span>
                      <button 
                        onClick={() => alert(`Analysis for ${competitor} would start here`)}
                        style={{
                          background: '#007bff',
                          color: 'white',
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🔍 Analyze
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>
                    No competitors added yet
                  </p>
                )}
              </div>
            </div>

            {/* Market Position */}
            <div style={{
              background: '#222',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🎯 Market Position</h2>
              
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
                  #{Math.min((company.competitors?.length || 0) + 1, 5)}
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>Your estimated ranking</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#4CAF50' }}>
                    {company.competitors?.length || 0}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Competitors tracked</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#007bff' }}>
                    {Math.round(100 / ((company.competitors?.length || 0) + 1))}%
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Market share est.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Chart */}
          <div style={{
            background: '#222',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #333'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>📊 AI Mention Analysis</h2>
            
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📈</div>
              <p style={{ margin: '0 0 5px 0' }}>Competitor analysis data will appear here</p>
              <p style={{ margin: 0, fontSize: '12px' }}>Add competitors and run tests to see detailed metrics</p>
            </div>
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
            onClick={() => window.location.href = '/geo'}
            style={{
              background: '#007bff',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🎯 My GEO
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
};

export default QuickTestCompetitors;