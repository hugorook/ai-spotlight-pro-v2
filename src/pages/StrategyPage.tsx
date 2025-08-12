import { useMemo, useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/MinimalAuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { Tables } from '@/types/supabase';

type Recommendation = { id: string; title: string; reason: string; priority?: 'high'|'medium'|'low' };
type TestResult = Tables<'ai_tests'>;
type Company = Tables<'companies'>;

export default function StrategyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'results'|'strategy'>('results');
  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [testResultsForStrategy, setTestResultsForStrategy] = useState<TestResult[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  // Load company and latest results for strategy generation
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);
      const userCompany = companies && companies.length > 0 ? companies[0] : null;
      setCompany(userCompany || null);
      if (!userCompany) return;
      const { data: tests } = await supabase
        .from('ai_tests')
        .select('*')
        .eq('company_id', userCompany.id)
        .order('test_date', { ascending: false })
        .limit(100);
      setTestResultsForStrategy(tests || []);
    })();
  }, [user]);

  const generateStrategy = useCallback(async () => {
    if (!company) {
      toast({ title: 'No company profile', description: 'Set up your company first', variant: 'destructive' });
      return;
    }
    if (testResultsForStrategy.length === 0) {
      toast({ title: 'No results yet', description: 'Run a Health Check to generate strategy', variant: 'destructive' });
      return;
    }
    setRecLoading(true);
    try {
      const payload = {
        companyName: company.company_name,
        results: testResultsForStrategy.map(r => ({
          prompt_text: r.prompt_text,
          company_mentioned: r.company_mentioned,
          mention_position: r.mention_position,
          sentiment: r.sentiment,
          mention_context: r.mention_context,
          ai_model: r.ai_model,
          test_date: r.test_date,
        })),
      };
      const { data, error } = await supabase.functions.invoke('generate-strategy', { body: payload });
      if (error) throw new Error(error.message);
      setAiRecommendations((data?.recommendations as Recommendation[]) || []);
      toast({ title: 'Strategy generated', description: 'Based on your latest results' });
    } catch (e: any) {
      console.error('generate-strategy error', e);
      toast({ title: 'Failed to generate strategy', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setRecLoading(false);
    }
  }, [company, testResultsForStrategy, toast]);

  const addToContentAssistant = async (rec: Recommendation) => {
    try {
      localStorage.setItem('strategy_queue', JSON.stringify([rec, ...getQueue()]));
      toast({ title: 'Added to Content Assistant', description: rec.title });
    } catch {
      toast({ title: 'Failed to add', description: 'Please try again', variant: 'destructive' });
    }
  };

  return (
    <AppShell title="Strategy" subtitle="From results to action">
      <div className="flex bg-muted/20 rounded-md p-1 mb-6 w-fit">
        <button onClick={() => setActiveTab('results')} className={`px-3 py-2 rounded text-sm ${activeTab==='results'?'bg-primary/30 text-foreground':'text-muted-foreground'}`}>Results</button>
        <button onClick={() => setActiveTab('strategy')} className={`px-3 py-2 rounded text-sm ${activeTab==='strategy'?'bg-primary/30 text-foreground':'text-muted-foreground'}`}>Strategy</button>
      </div>

      {activeTab==='results' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">All Results</h3>
          <p className="text-sm text-muted-foreground mb-4">Historical test data from your Health Checks and custom prompts.</p>
          <ResultsTable />
        </div>
      )}

      {activeTab==='strategy' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
          <p className="text-sm text-muted-foreground mb-4">AI-generated actions from your results. Send them to Content Assistant to generate content.</p>

          <div className="flex items-center gap-2 mb-4">
            <button onClick={generateStrategy} disabled={recLoading} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {recLoading ? 'Analyzing…' : 'Generate Strategy from Results'}
            </button>
            {aiRecommendations && (
              <span className="text-xs text-muted-foreground">{aiRecommendations.length} recommendations</span>
            )}
          </div>

          {!aiRecommendations && (
            <div className="text-sm text-muted-foreground">No AI strategy generated yet. Click “Generate Strategy from Results”.</div>
          )}

          {aiRecommendations && aiRecommendations.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {aiRecommendations.map(rec => (
                <div key={rec.id} className="rounded-md border border-border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold mb-1">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>
                    </div>
                    {rec.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${rec.priority==='high' ? 'bg-red-500/10 text-red-500 border-red-500/30' : rec.priority==='medium' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>{rec.priority}</span>
                    )}
                  </div>
                  <button onClick={() => addToContentAssistant(rec)} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90">Add to Content Assistant</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function getQueue(): Recommendation[] {
  try {
    const raw = localStorage.getItem('strategy_queue');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function ResultsTable() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  const loadResults = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get company first
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      if (companyError) {
        console.error('Error loading company:', companyError);
        setLoading(false);
        return;
      }

      const userCompany = companies && companies.length > 0 ? companies[0] : null;
      if (userCompany) {
        setCompany(userCompany);

        // Load test results
        const { data: tests, error: testsError } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', userCompany.id)
          .order('test_date', { ascending: false })
          .limit(50);

        if (!testsError && tests) {
          setTestResults(tests);
        } else {
          console.error('Error loading tests:', testsError);
          setTestResults([]);
        }
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Loading results...</span>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl mb-2">🏢</div>
        <p className="text-sm text-muted-foreground mb-4">No company profile found</p>
        <button
          onClick={() => window.location.href = '/geo'}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          Set Up Company Profile
        </button>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🧪</div>
        <p className="text-sm text-muted-foreground mb-4">No test results yet</p>
        <p className="text-xs text-muted-foreground mb-6">Run a health check to see your AI visibility results here</p>
        <button
          onClick={() => window.location.href = '/geo'}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          Run Health Check
        </button>
      </div>
    );
  }

  const mentionRate = Math.round((testResults.filter(t => t.company_mentioned).length / testResults.length) * 100);
  const avgPosition = testResults
    .filter(t => t.company_mentioned && t.mention_position && t.mention_position > 0)
    .reduce((sum, t, _, arr) => sum + (t.mention_position || 0) / arr.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{testResults.length}</div>
          <div className="text-xs text-muted-foreground">Total Tests</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{mentionRate}%</div>
          <div className="text-xs text-muted-foreground">Mention Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{avgPosition.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Avg Position</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 border-b border-border">
          <h4 className="text-sm font-medium text-foreground">Recent Test Results</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={result.id} className={`flex items-center justify-between p-4 border-b border-border ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-medium text-foreground text-sm mb-1 truncate">
                  {result.prompt_text || 'Custom prompt'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{result.ai_model}</span>
                  <span>•</span>
                  <span>{new Date(result.test_date).toLocaleDateString()}</span>
                  {result.mention_context && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-48">{result.mention_context}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  result.company_mentioned 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {result.company_mentioned ? `#${result.mention_position || 'N/A'}` : 'Not Mentioned'}
                </span>
                <span className="px-2 py-1 rounded-full text-xs bg-muted/50 text-muted-foreground capitalize">
                  {result.sentiment || 'neutral'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load More */}
      {testResults.length >= 50 && (
        <div className="text-center pt-2">
          <button 
            onClick={loadResults}
            className="text-sm text-primary hover:text-primary/80"
          >
            Load more results...
          </button>
        </div>
      )}
    </div>
  );
}

