import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { invokeCopilot, runHealthCheckNow, runCompetitorRetestNow, logEvent } from "@/integrations/supabase/functions";

export default function CopilotSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const suggestions = getSuggestions(location.pathname);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open Copilot"
            className="fixed bottom-6 right-6 z-40 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 h-12 w-12 text-xl"
          >
            🤖
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[380px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>AI Copilot</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-md border border-border p-3 bg-muted/10">
              <p className="text-sm text-muted-foreground m-0">Context</p>
              <p className="text-sm font-medium m-0">{prettyPath(location.pathname)}</p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Suggested actions</p>
              <div className="flex flex-col gap-2">
                {suggestions.map(({ label, to, action }) => (
                  <button
                    key={label}
                    onClick={async () => {
                      if (action === 'run_health') { await runHealthCheckNow(); await logEvent({ type: 'copilot_run_health' }); }
                      else if (action === 'run_competitor_retest') { await runCompetitorRetestNow(); await logEvent({ type: 'copilot_run_competitor_retest' }); }
                      else { navigate(to); }
                      setOpen(false);
                    }}
                    className="w-full text-left rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Ask Copilot</p>
              <CopilotAsk contextPath={location.pathname} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function prettyPath(path: string) {
  return path.split('/').filter(Boolean).map(cap).join(' / ') || 'Home';
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function getSuggestions(path: string): { label: string; to: string; action?: 'run_health'|'run_competitor_retest' }[] {
  if (path.startsWith('/geo')) {
    return [
      { label: '▶️ Run Health Check', to: '/geo?run=health', action: 'run_health' },
      { label: '✍️ Generate Content Brief', to: '/content?new=brief' },
      { label: '🏆 Analyze Competitors', to: '/competitors' },
    ];
  }
  if (path.startsWith('/competitors')) {
    return [
      { label: '➕ Add Competitor', to: '/competitors?add=1' },
      { label: '▶️ Run Health Check', to: '/geo?run=health', action: 'run_health' },
      { label: '✍️ Generate Content', to: '/content' },
    ];
  }
  if (path.startsWith('/content')) {
    return [
      { label: 'Use Prompt Library', to: '/geo#strategy' },
      { label: 'View Competitors', to: '/competitors' },
      { label: 'Go to Dashboard', to: '/dashboard' },
    ];
  }
  return [
    { label: '🎯 My GEO', to: '/geo' },
    { label: '🏆 Competitors', to: '/competitors' },
    { label: '✍️ Content Assistant', to: '/content' },
  ];
}

function CopilotAsk({ contextPath }: { contextPath?: string }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const submit = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer(null);
    const res = await invokeCopilot({ question: q.trim(), contextPath });
    setAnswer(res?.answer ?? 'No response');
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask for help or generate an idea..."
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button onClick={submit} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 text-sm hover:bg-primary/90 disabled:opacity-50">{loading ? '...' : 'Send'}</button>
      </div>
      {answer && (
        <div className="mt-3 rounded-md border border-border bg-muted/10 p-3 text-sm whitespace-pre-wrap">{answer}</div>
      )}
    </div>
  );
}

