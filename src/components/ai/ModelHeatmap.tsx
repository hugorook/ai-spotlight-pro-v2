import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/types/supabase";

type TestRow = Tables<'ai_tests'>;

type Props = {
  companyId: string;
  models?: string[];
};

export default function ModelHeatmap({ companyId, models }: Props) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d'|'30d'|'90d'|'all'>('30d');
  const [modelFilter, setModelFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    (async () => {
      try {
        const fromDate = timeframe === 'all' ? null : new Date(Date.now() - (
          timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
        ) * 24 * 60 * 60 * 1000).toISOString();
        let query = supabase.from('ai_tests').select('*').eq('company_id', companyId);
        if (fromDate) query = query.gte('test_date', fromDate);
        const { data, error } = await query.order('test_date', { ascending: false }).limit(500);
        if (!error && data) setTests(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, timeframe]);

  const modelList = useMemo(() => {
    if (models && models.length) return models;
    const unique = Array.from(new Set(tests.map(t => t.ai_model)));
    return unique.length ? unique : ['gpt-4o','claude-3.5','gemini-1.5'];
  }, [tests, models]);

  const promptGroups = useMemo(() => {
    const byPrompt: Record<string, TestRow[]> = {};
    for (const t of tests) {
      const key = t.prompt_text || t.prompt_id || 'Unknown prompt';
      (byPrompt[key] ||= []).push(t);
    }
    return Object.entries(byPrompt).slice(0, 6);
  }, [tests]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Model Coverage Heatmap</h3>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground m-0">Mentions by model and prompt</p>
          <div className="flex items-center gap-2">
            <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value as any)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="all">All models</option>
              {modelList.map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as any)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="90d">Last 90d</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading heatmap…</div>
      ) : tests.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">No test data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-grid gap-x-2" style={{ gridTemplateColumns: `260px repeat(${(modelFilter==='all'?modelList:[modelFilter]).length}, 120px)` }}>
            <div></div>
            {(modelFilter==='all'?modelList:[modelFilter]).map((m) => (
              <div key={m} className="text-xs text-muted-foreground text-center pb-2">{m}</div>
            ))}
            {promptGroups.map(([promptKey, rows]) => (
              <Row key={promptKey} promptKey={promptKey} rows={rows} models={(modelFilter==='all'?modelList:[modelFilter])} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ promptKey, rows, models }: { promptKey: string; rows: TestRow[]; models: string[] }) {
  const byModel: Record<string, TestRow[]> = {};
  for (const r of rows) {
    (byModel[r.ai_model] ||= []).push(r);
  }
  return (
    <>
      <div className="text-xs text-foreground pr-3 py-2 truncate max-w-[260px]">{promptKey}</div>
      {models.map((m) => {
        const testsForModel = byModel[m] || [];
        const mentionedRate = testsForModel.length
          ? testsForModel.filter(t => t.company_mentioned).length / testsForModel.length
          : 0;
        const color = mentionedRate >= 0.66
          ? 'bg-green-500/80'
          : mentionedRate >= 0.33
          ? 'bg-yellow-500/80'
          : testsForModel.length
          ? 'bg-gray-500/60'
          : 'bg-muted';
        return (
          <div key={m} className="flex items-center justify-center py-2">
            <span className={`inline-block h-4 w-4 rounded ${color}`} title={`${Math.round(mentionedRate*100)}%`} />
          </div>
        );
      })}
    </>
  );
}

