import { useState, useEffect, useCallback } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/MinimalAuthContext";
import type { Tables } from "@/types/supabase";
import AppShell from "@/components/layout/AppShell";
import CommandPalette from "@/components/CommandPalette";
import LoadingOverlay from "@/components/LoadingOverlay";
import { scheduleJob, logEvent } from "@/integrations/supabase/functions";
import { downloadCsv } from "@/lib/export";
import { printReport } from "@/lib/pdf";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Company = Pick<Tables<'companies'>, 'id' | 'company_name' | 'competitors'>;

interface CompetitorAnalysis {
  competitor: string;
  mention_frequency: number;
  avg_position: number;
  sentiment_score: number;
  market_share: number;
}

const CleanCompetitorPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [monthlyRetest, setMonthlyRetest] = useState<boolean>(false);

  const loadCompetitorAnalysis = useCallback(async (companyId: string, competitors: string[]) => {
    try {
      const analysis = await calculateCompetitorAnalysisFromTests(companyId, competitors);
      setCompetitorAnalysis(analysis);
    } catch (error) {
      console.error('Error loading competitor analysis:', error);
      setCompetitorAnalysis([]);
    }
  }, []);

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
        
        // Load schedule settings
        const { data: schedules } = await supabase
          .from('schedules')
          .select('*')
          .eq('company_id', company.id);
        
        if (schedules && schedules.length > 0) {
          setMonthlyRetest(schedules[0].monthly_competitor_retest || false);
        }
        
        await loadCompetitorAnalysis(company.id, company.competitors || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loadCompetitorAnalysis]);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user, loadCompanyData]);

  const calculateCompetitorAnalysisFromTests = async (companyId: string, competitors: string[]): Promise<CompetitorAnalysis[]> => {
    try {
      const { data: tests } = await supabase
        .from('ai_tests')
        .select('*')
        .eq('company_id', companyId);

      if (!tests) return [];

      const analysis: CompetitorAnalysis[] = competitors.map(competitor => {
        const competitorMentions = tests.filter(test => 
          test.competitors_mentioned && test.competitors_mentioned.includes(competitor)
        );
        
        const totalTests = tests.length;
        const mentionFrequency = totalTests > 0 ? (competitorMentions.length / totalTests) * 100 : 0;
        
        const avgPosition = competitorMentions.length > 0 
          ? competitorMentions.reduce((sum, test) => sum + (test.mention_position || 10), 0) / competitorMentions.length
          : 10;

        const sentimentScore = competitorMentions.length > 0
          ? competitorMentions.reduce((sum, test) => {
              const score = test.sentiment === 'positive' ? 1 : test.sentiment === 'negative' ? -1 : 0;
              return sum + score;
            }, 0) / competitorMentions.length
          : 0;

        return {
          competitor,
          mention_frequency: Math.round(mentionFrequency),
          avg_position: Math.round(avgPosition * 10) / 10,
          sentiment_score: Math.round(sentimentScore * 100) / 100,
          market_share: Math.round(mentionFrequency * 0.6)
        };
      }).sort((a, b) => b.mention_frequency - a.mention_frequency);

      return analysis;
    } catch (error) {
      console.error('Error calculating competitor analysis:', error);
      return [];
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim() || !company) return;

    try {
      setIsAddingCompetitor(true);
      const updatedCompetitors = [...(company.competitors || []), newCompetitor.trim()];

      const { error } = await supabase
        .from('companies')
        .update({ competitors: updatedCompetitors })
        .eq('id', company.id);

      if (error) throw error;

      setCompany(prev => prev ? { ...prev, competitors: updatedCompetitors } : null);
      setNewCompetitor("");
      await loadCompetitorAnalysis(company.id, updatedCompetitors);

      console.log(`Competitor Added: ${newCompetitor}`);
    } catch (error) {
      console.error('Error adding competitor:', error);
      alert('Failed to add competitor. Please try again.');
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleRemoveCompetitor = async (competitorToRemove: string) => {
    if (!company) return;

    try {
      const updatedCompetitors = company.competitors.filter(comp => comp !== competitorToRemove);

      const { error } = await supabase
        .from('companies')
        .update({ competitors: updatedCompetitors })
        .eq('id', company.id);

      if (error) throw error;

      setCompany(prev => prev ? { ...prev, competitors: updatedCompetitors } : null);
      await loadCompetitorAnalysis(company.id, updatedCompetitors);

      console.log(`Competitor Removed: ${competitorToRemove}`);
    } catch (error) {
      console.error('Error removing competitor:', error);
      alert('Failed to remove competitor. Please try again.');
    }
  };

  const runCompetitorTest = async (competitor: string) => {
    if (!company) return;

    try {
      setRunningTests(prev => new Set(prev).add(competitor));
      // Call real edge function
      await supabase.functions.invoke('test-competitor', {
        body: { companyId: company.id, competitor, industry: undefined }
      });
      await loadCompetitorAnalysis(company.id, company.competitors);
      console.log(`Competitor Test Completed: ${competitor}`);
      toast({ title: 'Competitor re-tested', description: competitor });
    } catch (error) {
      console.error('Error running competitor test:', error);
      alert('Failed to run competitor analysis. Please try again.');
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(competitor);
        return newSet;
      });
    }
  };

  const copyCompetitorAnalysis = () => {
    try {
      const lines = competitorAnalysis.map(a => `${a.competitor} | Mentions ${a.mention_frequency}% | AvgPos #${a.avg_position} | Sent ${a.sentiment_score}`);
      navigator.clipboard.writeText(lines.join('\n'));
      toast({ title: 'Copied to clipboard', description: 'Competitor analysis copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  // Styles
  const cardStyle = {
    background: 'rgba(17, 17, 17, 0.8)',
    border: '1px solid #333',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    padding: '24px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #444',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #444',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: '14px'
  };

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #444',
    background: 'rgba(17, 17, 17, 0.8)',
    color: '#fff',
    cursor: 'pointer'
  };

  const badgeStyle = {
    padding: '4px 8px',
    borderRadius: '16px',
    background: 'rgba(102, 126, 234, 0.2)',
    color: '#667eea',
    fontSize: '12px',
    fontWeight: '500'
  };

  if (loading) {
    return (
      <AppShell title="Competitor Positioning" subtitle="Analyze how competitors appear in AI responses and identify market opportunities">
        <LoadingOverlay loading label="Loading competitors...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </LoadingOverlay>
        <CommandPalette />
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="Competitor Positioning" subtitle="Analyze how competitors appear in AI responses and identify market opportunities">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-2">No Company Profile Found</h2>
          <p className="text-muted-foreground mb-6">You need to set up your company profile first to access competitor analysis.</p>
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

  return (
    <AppShell
      title="Competitor Positioning"
      subtitle="Analyze how competitors appear in AI responses and identify market opportunities"
      right={(
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      )}
    >

        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          {/* Competitor Management */}
          <div className="flex flex-col gap-6">
            <div style={cardStyle}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👥 Manage Competitors
              </h3>
              <p style={{ color: '#999', marginBottom: '16px', fontSize: '14px' }}>
                Add and manage your main competitors for analysis
              </p>
              
              <div className="flex gap-2 mb-4">
                <input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  placeholder="Competitor name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button 
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.trim() || isAddingCompetitor}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isAddingCompetitor ? '⏳' : '➕'}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {company.competitors && company.competitors.length > 0 ? (
                  company.competitors.map((competitor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted/10">
                      <span className="text-sm font-medium">{competitor}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => runCompetitorTest(competitor)}
                          disabled={runningTests.has(competitor)}
                          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          {runningTests.has(competitor) ? '⏳' : '▶️'}
                        </button>
                        <button 
                          onClick={() => handleRemoveCompetitor(competitor)}
                          className="inline-flex items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-foreground px-2 py-1 text-xs font-medium hover:bg-destructive/20"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No competitors added yet</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎯 Market Position
              </h3>
              
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                  #{Math.min(competitorAnalysis.length + 1, 5)}
                </div>
                <p style={{ fontSize: '14px', color: '#999' }}>Your estimated ranking</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
                    {competitorAnalysis.length}
                  </div>
                  <p style={{ fontSize: '12px', color: '#999' }}>Competitors tracked</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#667eea' }}>
                    {Math.round(100 / (competitorAnalysis.length + 1))}%
                  </div>
                  <p style={{ fontSize: '12px', color: '#999' }}>Market share est.</p>
                </div>
              </div>

          {/* Scheduling Toggle */}
          <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/10 p-3">
            <div>
              <p className="text-sm font-medium text-foreground m-0">Auto re-test competitors monthly</p>
              <p className="text-xs text-muted-foreground m-0">We’ll refresh analysis and notify you</p>
            </div>
            <button
              onClick={async () => {
                const enabled = !monthlyRetest;
                setMonthlyRetest(enabled);
                if (company) {
                  await scheduleJob({ type: 'monthly-competitor-retest', enabled, companyId: company.id });
                }
                alert(enabled ? 'Monthly competitor re-test scheduled' : 'Monthly competitor re-test disabled');
              }}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium border ${monthlyRetest ? 'bg-primary text-primary-foreground border-transparent' : 'bg-background text-foreground border-input'}`}
            >
              {monthlyRetest ? 'Scheduled ✓' : 'Schedule'}
            </button>
          </div>
            </div>
          </div>

          {/* Competitor Analysis */}
          <div id="competitor-report" className="flex flex-col gap-6">
            {/* Competition Chart */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 AI Mention Frequency
                </h3>
                <button
                  onClick={() => { downloadCsv('competitor-analysis.csv', competitorAnalysis as any); logEvent({ type: 'export_competitor_analysis', companyId: company?.id }); }}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Export CSV
                </button>
              </div>
              <div className="flex justify-end mb-2">
                <button onClick={copyCompetitorAnalysis} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">📋 Copy</button>
              </div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => { printReport('competitor-report'); logEvent({ type: 'print_competitor_pdf', companyId: company?.id }); }}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Print PDF
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">How often competitors are mentioned in AI responses</p>
              
              {competitorAnalysis.length > 0 ? (
                <div style={{ height: '256px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={competitorAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="competitor" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fill: '#999', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{
                          background: 'rgba(17, 17, 17, 0.9)',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="mention_frequency" fill="#667eea" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <div className="text-5xl mb-4 opacity-50">🔍</div>
                  <p>No competitor data available</p>
                  <p className="text-sm">Add competitors to see analysis</p>
                </div>
              )}
            </div>

            {/* Detailed Competitor Analysis */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-2">Detailed Analysis</h3>
              <p className="text-sm text-muted-foreground mb-4">In-depth competitor performance metrics</p>
              
              {competitorAnalysis.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {competitorAnalysis.map((analysis, index) => (
                    <div key={analysis.competitor} className="rounded-md bg-muted/10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">#{index + 1}</span>
                          <h4 className="font-semibold">{analysis.competitor}</h4>
                        </div>
                        <button 
                          onClick={() => runCompetitorTest(analysis.competitor)}
                          disabled={runningTests.has(analysis.competitor)}
                          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          {runningTests.has(analysis.competitor) ? (
                            <>⏳ Testing...</>
                          ) : (
                            <>⚡ Re-test</>
                          )}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-primary">{analysis.mention_frequency}</div>
                          <p className="text-xs text-muted-foreground">Mentions</p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">#{analysis.avg_position}</div>
                          <p className="text-xs text-muted-foreground">Avg Position</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-semibold ${analysis.sentiment_score > 0 ? 'text-green-500' : analysis.sentiment_score < 0 ? 'text-red-500' : 'text-muted-foreground'}`}> 
                            {analysis.sentiment_score > 0 ? '📈' : analysis.sentiment_score < 0 ? '📉' : '~'}
                          </div>
                          <p className="text-xs text-muted-foreground">Sentiment</p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-yellow-500">{analysis.market_share}%</div>
                          <p className="text-xs text-muted-foreground">Share Est.</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <div className="text-5xl mb-4 opacity-50">⚠️</div>
                  <p>No competitor analysis available</p>
                  <p className="text-sm">Add competitors and run tests to see detailed analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      <CommandPalette />
    </AppShell>
  );
};

export default CleanCompetitorPage;