import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/MinimalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/types/supabase";
import AppShell from "@/components/layout/AppShell";
import CommandPalette from "@/components/CommandPalette";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { printReport } from "@/lib/pdf";
import { downloadCsv } from "@/lib/export";

type Company = Tables<'companies'>;
type TestResult = Tables<'ai_tests'>;

const CleanDashboard = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Load company data
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      if (companyError) {
        console.error('Error loading company:', companyError);
        setLoading(false);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);

        // Load test results
        console.log('Loading test results for company:', company.id);
        const { data: tests, error: testsError } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false })
          .limit(10);

        console.log('Test results query response:', { tests, testsError });
        
        if (!testsError && tests) {
          console.log(`Setting ${tests.length} test results:`, tests);
          setTestResults(tests);
        } else {
          console.log('No tests found or error occurred');
          setTestResults([]);
        }
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const calculateVisibilityScore = () => {
    if (testResults.length === 0) return 0;
    const mentionedTests = testResults.filter(test => test.company_mentioned);
    return Math.round((mentionedTests.length / testResults.length) * 100);
  };

  const getRecentPerformance = () => {
    const recent = testResults.slice(0, 5);
    const mentioned = recent.filter(test => test.company_mentioned).length;
    return recent.length > 0 ? Math.round((mentioned / recent.length) * 100) : 0;
  };

  const [trendTimeframe, setTrendTimeframe] = useState<'30d'|'90d'|'all'>('90d');
  const trendData = testResults
    .slice()
    .reverse()
    .filter(t => {
      if (trendTimeframe === 'all') return true;
      const days = trendTimeframe === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return new Date(t.test_date).getTime() >= cutoff;
    })
    .map(t => ({
      date: new Date(t.test_date).toLocaleDateString(),
      mentioned: t.company_mentioned ? 1 : 0,
    }))
    .reduce<{ date: string; rate: number; count: number }[]>((acc, cur) => {
      const last = acc[acc.length - 1];
      const entry = { date: cur.date, rate: (last?.rate ?? 0), count: (last?.count ?? 0) };
      entry.count += 1;
      entry.rate = Math.round(((entry.rate * (entry.count - 1)) + cur.mentioned * 100) / entry.count);
      acc.push(entry);
      return acc;
    }, []);

  if (loading) {
    return (
      <AppShell title="AI Visibility Hub" subtitle="Monitor your company's AI mentions and performance">
        <LoadingOverlay loading label="Loading dashboard...">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="h-32 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
            </div>
            <div className="h-64 bg-muted rounded" />
          </div>
        </LoadingOverlay>
        <CommandPalette />
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="AI Visibility Hub" subtitle="Monitor your company's AI mentions and performance">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-2xl font-semibold text-foreground mb-2">No Company Profile Found</div>
          <div className="text-muted-foreground mb-6">You need to set up your company profile to access the dashboard.</div>
          <button
            onClick={() => (window.location.href = '/geo')}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Set Up Company Profile
          </button>
        </div>
        <CommandPalette />
      </AppShell>
    );
  }

  const visibilityScore = calculateVisibilityScore();
  const recentPerformance = getRecentPerformance();

  return (
    <AppShell title="AI Visibility Hub" subtitle="Monitor your company's AI mentions and performance">

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Visibility Score */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>AI Visibility Score</h3>
            <span style={{ fontSize: '20px' }}>📈</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50', marginBottom: '10px' }}>
            {visibilityScore}%
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            Based on {testResults.length} tests
          </div>
          <div style={{
            background: '#333',
            height: '8px',
            borderRadius: '4px',
            marginTop: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#4CAF50',
              height: '100%',
              width: `${visibilityScore}%`,
              borderRadius: '4px'
            }}></div>
          </div>
        </div>

        {/* Recent Performance */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Performance</h3>
            <span style={{ fontSize: '20px' }}>📊</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
            {recentPerformance}%
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
            Last 5 tests
          </div>
          <div style={{
            background: recentPerformance >= 50 ? '#4CAF50' : '#f44336',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {recentPerformance >= 50 ? "Good" : "Needs Improvement"}
          </div>
        </div>

        {/* Total Tests */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Total Tests</h3>
            <span style={{ fontSize: '20px' }}>🧪</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
            {testResults.length}
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            {testResults.filter(t => t.company_mentioned).length} mentions found
          </div>
        </div>
      </div>

      {/* Next Best Actions removed per redesign */}

      {/* Company Profile and Recent Tests */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {/* Trend Chart */}
        <div id="dashboard-trend-report" className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">📈 Visibility trend</h3>
            <select value={trendTimeframe} onChange={(e) => setTrendTimeframe(e.target.value as any)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="30d">Last 30d</option>
              <option value="90d">Last 90d</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex justify-end mb-2">
            <button onClick={() => printReport('dashboard-trend-report')} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">Print PDF</button>
          </div>
          {trendData.length > 2 ? (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'rgba(17,17,17,0.9)', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="rate" stroke="#667eea" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Not enough data yet. Run more tests to see the trend.</div>
          )}
        </div>
        {/* Company Profile */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏢 Company Profile
            </h3>
            <button
              onClick={() => window.location.href = '/geo?edit=true'}
              style={{
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ⚙️ Edit
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>{company.company_name}</h4>
            <div style={{ color: '#888', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              🌐 {company.website_url}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
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

          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#ccc', lineHeight: '1.4' }}>
              {company.description}
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h5 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>Target Customers</h5>
            <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>{company.target_customers}</p>
          </div>

          <div>
            <h5 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>Key Differentiators</h5>
            <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>{company.key_differentiators}</p>
          </div>
        </div>

        {/* Recent Test Results */}
        <div style={{
          background: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>🧪 Recent Test Results</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = '/geo'}
                style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                View All →
              </button>
              <button
                onClick={() => downloadCsv('ai_tests.csv', testResults as any)}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Export CSV
              </button>
            </div>
          </div>

          {testResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🧪</div>
              <p style={{ margin: '0 0 5px 0' }}>No test results yet</p>
              <p style={{ margin: 0, fontSize: '12px' }}>Run your first AI visibility test to see results here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {testResults.slice(0, 5).map((test) => (
                <div key={test.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#111',
                  borderRadius: '6px',
                  border: '1px solid #333'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '8px',
                      background: test.company_mentioned ? '#4CAF50' : '#f44336',
                      borderRadius: '4px'
                    }}>
                      {test.company_mentioned ? '✅' : '❌'}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {test.ai_model}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                        {new Date(test.test_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {test.company_mentioned ? (
                      <div style={{
                        background: '#4CAF50',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        Position #{test.mention_position}
                      </div>
                    ) : (
                      <div style={{
                        background: '#f44336',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        Not Mentioned
                      </div>
                    )}
                    {test.sentiment && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#888', textTransform: 'capitalize' }}>
                        {test.sentiment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        <CommandPalette />
    </AppShell>
  );
};

export default CleanDashboard;