import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/MinimalAuthContext";
import AppShell from "@/components/layout/AppShell";
import CommandPalette from "@/components/CommandPalette";
import { useToast } from "@/components/ui/use-toast";
import LoadingOverlay from "@/components/LoadingOverlay";

const MinimalContentPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [strategyQueue, setStrategyQueue] = useState<any[]>([]);
  const [contentTopic, setContentTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadCompanyData();
    } else {
      setLoading(false);
    }
    // load queue
    try { const raw = localStorage.getItem('strategy_queue'); setStrategyQueue(raw? JSON.parse(raw): []);} catch {}
  }, [user]);

  const loadCompanyData = async () => {
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (companies && companies.length > 0) {
        setCompany(companies[0]);
      }
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (topicOverride?: string) => {
    const topic = (topicOverride ?? contentTopic).trim();
    if (!topic || !company) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          targetCustomers: company.target_customers,
          differentiators: company.key_differentiators,
          topic,
        },
      });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      const content = (data as any)?.content ?? '';
      setGeneratedContent(content);
      toast({ title: 'Content generated', description: `Draft created for “${topic}”.` });
    } catch (error) {
      console.error('Content generation error:', error);
      const msg = (error as any)?.message || 'Please try again later.';
      toast({ title: 'Failed to generate content', description: msg, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(generatedContent);
      toast({ title: 'Copied to clipboard', description: 'Generated content is ready to paste.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppShell title="Content Assistant" subtitle="Generate AI-optimized content">
        <LoadingOverlay loading label="Loading content tools...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-52 bg-muted rounded" />
          </div>
        </LoadingOverlay>
        <CommandPalette />
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="Content Assistant" subtitle="Generate AI-optimized content">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">No Company Profile</h2>
          <p className="text-muted-foreground mb-6">Please set up your company profile first.</p>
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
    <AppShell title="Content Assistant" subtitle={`Generate AI-optimized content for ${company.company_name}`}>
      <div className="grid gap-10 md:grid-cols-[260px_1fr_2fr]">
          {/* Strategy Sidebar */}
          <div className="rounded-lg bg-card p-4 h-fit shadow-soft">
            <h4 className="text-sm font-semibold mb-2">Strategy Recommendations</h4>
            {strategyQueue.length === 0 ? (
              <p className="text-xs text-muted-foreground">No items yet. Add from Strategy page.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {strategyQueue.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { const title = item.title || String(item); setContentTopic(title); generateContent(title); }}
                    className="text-left rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                  >
                    {item.title || String(item)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Generator */}
          <div className="rounded-lg bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground mb-4">Generate Content</h3>
            
            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground mb-1">Content Topic</label>
              <input
                type="text"
                value={contentTopic}
                onChange={(e) => setContentTopic(e.target.value)}
                placeholder="What should the content be about?"
                className="flex h-10 w-full rounded-md border border-transparent bg-white text-black px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm placeholder:text-black/60"
              />
            </div>

            <button
              onClick={generateContent}
              disabled={!contentTopic.trim() || isGenerating}
              className="inline-flex w-full items-center justify-center rounded-md gradient-accent text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isGenerating ? 'Generating…' : 'Generate Content'}
            </button>

            {/* Company Info */}
            <div className="mt-6 rounded-md bg-card p-4 text-sm text-muted-foreground shadow-soft">
              <h4 className="text-sm font-semibold text-foreground mb-2">Company Profile</h4>
              <p><span className="font-medium text-foreground">Name:</span> {company.company_name}</p>
              <p><span className="font-medium text-foreground">Industry:</span> {company.industry}</p>
              <p><span className="font-medium text-foreground">Customers:</span> {company.target_customers}</p>
            </div>
          </div>

          {/* Generated Content */}
          <div className="rounded-lg bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Generated Content</h3>
              {generatedContent && (
                <button
                  onClick={copyToClipboard}
                   className="inline-flex items-center justify-center rounded-md border border-transparent gradient-accent px-3 py-1.5 text-xs font-medium"
                >
                  Copy
                </button>
              )}
            </div>

            {generatedContent ? (
              <textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="w-full min-h-[400px] rounded-md border border-transparent bg-white text-black p-4 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-center">
                <div>
                  <p>Generated content will appear here</p>
                  <p className="text-sm">Enter a topic and click generate to start</p>
                </div>
              </div>
            )}
          </div>
      </div>
      <CommandPalette />
    </AppShell>
  );
};

export default MinimalContentPage;