import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/types/supabase";
import AppShell from "@/components/layout/AppShell";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import HeaderStrip from '@/components/dashboard/HeaderStrip';
import Tiles from '@/components/dashboard/Tiles';
import BigMovers from '@/components/dashboard/BigMovers';
import Matrix from '@/components/dashboard/Matrix';
import { printReport } from "@/lib/pdf";
import { downloadCsv } from "@/lib/export";
import WelcomeFlow from "@/components/onboarding/WelcomeFlow";
import { useNavigate } from "react-router-dom";
import { NoHealthCheckResults } from "@/components/ui/empty-states";

function RecentTestsTable({ tests }: { tests: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full body text-xs">
        <thead>
          <tr className="border-b border-input">
            <th className="text-left py-2 pr-3 body font-semibold">Prompt</th>
            <th className="text-left py-2 pr-3 body font-semibold">Model</th>
            <th className="text-left py-2 pr-3 body font-semibold">Mentioned</th>
            <th className="text-left py-2 pr-3 body font-semibold">Position</th>
            <th className="text-left py-2 pr-3 body font-semibold">Sentiment</th>
            <th className="text-left py-2 body font-semibold">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {tests.slice(0, 10).map((t) => (
            <tr key={t.id} className="border-b border-input">
              <td className="py-2 pr-3 truncate max-w-[220px]">{t.prompt_text || t.prompt_id || '—'}</td>
              <td className="py-2 pr-3">{t.ai_model}</td>
              <td className="py-2 pr-3">{t.company_mentioned ? 'Yes' : 'No'}</td>
              <td className="py-2 pr-3">{t.mention_position ?? '—'}</td>
              <td className="py-2 pr-3 capitalize">{t.sentiment ?? 'neutral'}</td>
              <td className="py-2">{new Date(t.test_date).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Company = Tables<'companies'>;
type TestResult = Tables<'ai_tests'>;

const CleanDashboard = () => {
  const { user, isFirstTimeUser, hasCompletedOnboarding } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<any | null>(null);
  // Single-dashboard view (no role toggles)

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

        // Load latest weekly snapshot
        try {
          const { data: snapshots, error: snapErr } = await (supabase as any)
            .from('weekly_snapshots')
            .select('*')
            .eq('brand_id', company.id)
            .order('week_start', { ascending: false })
            .limit(1);
          if (!snapErr) setWeekly((snapshots && snapshots[0]) || null);
        } catch (e) {
          console.warn('weekly_snapshots read failed', e);
        }

        // Scheduling toggle removed
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
      </AppShell>
    );
  }

  const visibilityScore = calculateVisibilityScore();
  const recentPerformance = getRecentPerformance();

  const headerScore = typeof weekly?.visibility_score === 'number' ? Math.round(weekly.visibility_score) : visibilityScore;
  const headerDelta = typeof weekly?.wow_delta === 'number' ? Math.round(weekly.wow_delta) : 0;
  const momentum: 'up' | 'down' | 'flat' = headerDelta > 0 ? 'up' : headerDelta < 0 ? 'down' : 'flat';
  const forecastVal = typeof weekly?.forecast === 'number' ? Math.round(weekly.forecast) : null;

  const rightToggle = (
    <div className="flex items-center gap-2">
      {company && (
        <button
          onClick={() => (window.location.href = '/geo?edit=true')}
          className="glass rounded-md px-3 py-1.5 text-xs hover:bg-[#5F209B] hover:text-white transition-none"
        >
          Edit Company
        </button>
      )}
    </div>
  );

  // Show welcome flow for first-time users
  if (!loading && isFirstTimeUser && !hasCompletedOnboarding) {
    return (
      <WelcomeFlow 
        onComplete={() => {
          // After onboarding, redirect to health check
          navigate('/geo');
        }} 
      />
    );
  }

  return (
    <AppShell title="AI Visibility Hub v1.1" subtitle="Monitor your company's AI mentions and performance" right={rightToggle}>

      {/* Header strip */}
      <div className="mb-3">
        <HeaderStrip score={headerScore} delta={headerDelta} momentum={momentum} forecast={forecastVal ?? undefined} />
      </div>

      {/* Row 1: Visibility Trend and Recent Performance */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {/* Visibility Trend */}
        <div id="dashboard-trend-report" className="rounded-lg bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="h3">Visibility trend</h3>
            <select value={trendTimeframe} onChange={(e) => setTrendTimeframe(e.target.value as any)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="30d">Last 30d</option>
              <option value="90d">Last 90d</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex justify-end mb-2">
            <button onClick={() => printReport('dashboard-trend-report')} className="glass rounded-md px-3 py-1.5 text-xs hover:bg-[#5F209B] hover:text-white transition-none">Print PDF</button>
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
            <div className="body text-sm text-gray-600">Not enough data yet. Run more tests to see the trend.</div>
          )}
        </div>
        {/* Recent Performance (tiles) */}
        <div className="rounded-lg bg-card p-4">
          <h3 className="h3 mb-3">Recent Performance</h3>
          <Tiles 
            mentionRate={weekly?.mention_rate ?? (testResults.length ? testResults.filter(t=>t.company_mentioned).length / testResults.length : 0)}
            avgPosition={weekly?.avg_position ?? null}
            modelCoverage={weekly?.model_coverage ?? {}}
            winStreak={weekly?.win_streak ?? 0}
          />
        </div>
      </div>

      {/* Row 2: Recent Test Results full width */}
      <div className="rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Recent Test Results</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href = '/geo'} className="glass rounded-md px-3 py-1.5 text-xs hover:bg-[#5F209B] hover:text-white transition-none">Run Health Check</button>
            <button onClick={() => downloadCsv('ai_tests.csv', testResults as any)} className="glass rounded-md px-3 py-1.5 text-xs hover:bg-[#5F209B] hover:text-white transition-none">Export CSV</button>
          </div>
        </div>
        {testResults.length === 0 ? (
          <NoHealthCheckResults onStartHealthCheck={() => navigate('/geo')} />
        ) : (
          <RecentTestsTable tests={testResults} />
        )}
      </div>
      {/* Movers and Matrix */}
      <div className="grid grid-cols-1 gap-3 mt-4">
        <BigMovers wins={(weekly?.biggest_wins ?? []).slice(0, 5)} losses={(weekly?.biggest_losses ?? []).slice(0, 5)} />
        {(() => {
          const coverage = weekly?.model_coverage ?? {};
          // Inflate to stage-mapped matrix (awareness/consideration/comparison) for current single-provider data
          const matrixData: any = {};
          Object.entries(coverage).forEach(([model, m]: any) => {
            matrixData[model] = {
              awareness: { mentionRate: m.mentionRate ?? 0, avgPosition: m.avgPosition ?? null, trend: 0 },
              consideration: { mentionRate: m.mentionRate ?? 0, avgPosition: m.avgPosition ?? null, trend: 0 },
              comparison: { mentionRate: m.mentionRate ?? 0, avgPosition: m.avgPosition ?? null, trend: 0 },
            };
          });
          return <Matrix data={matrixData} />;
        })()}
      </div>

    </AppShell>
  );
};

export default CleanDashboard;