// Supabase Edge Function: run-health-check
// Deploy: supabase functions deploy run-health-check --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Process all companies (no schedules dependency)
async function listCompaniesToProcess() {
  const res = await fetch(`${url}/rest/v1/companies?select=id`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error('Failed to read companies');
  const companies = await res.json();
  return companies.map((c: any) => c.id as string);
}

async function getCompany(companyId: string) {
  const res = await fetch(`${url}/rest/v1/companies?id=eq.${companyId}&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error('Failed to read company');
  const [company] = await res.json();
  return company;
}

async function callTester(input: { prompt: string; companyName: string; industry?: string; description?: string; differentiators?: string }) {
  const res = await fetch(`${url}/functions/v1/test-ai-models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function insertTest(companyId: string, prompt: string, result: any) {
  const body = [{
    company_id: companyId,
    ai_model: 'openai-gpt-4o-mini',
    company_mentioned: !!result.mentioned,
    mention_position: result.position || 0,
    sentiment: result.sentiment || 'neutral',
    response_text: '',
    prompt_text: prompt,
    competitors_mentioned: [],
    test_date: new Date().toISOString(),
  }];
  const res = await fetch(`${url}/rest/v1/ai_tests`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

function startOfWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10); // yyyy-mm-dd
}

async function fetchAiTests(companyId: string, sinceISO: string) {
  const params = new URLSearchParams({
    select: '*',
    company_id: `eq.${companyId}`,
    test_date: `gte.${sinceISO}`,
    order: 'test_date.desc',
  } as any);
  const res = await fetch(`${url}/rest/v1/ai_tests?${params.toString()}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchLatestSnapshot(companyId: string) {
  const res = await fetch(`${url}/rest/v1/weekly_snapshots?brand_id=eq.${companyId}&select=*&order=week_start.desc&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

function computeMetrics(tests: any[]) {
  if (!tests || tests.length === 0) {
    return { mentionRate: 0, avgPosition: 10, visibilityScore: 0, modelCoverage: {}, movers: { wins: [], losses: [] } };
  }
  const mentioned = tests.filter((t) => t.company_mentioned);
  const mentionRate = mentioned.length / tests.length;
  const positions = mentioned.filter((t) => (t.mention_position ?? 0) > 0).map((t) => t.mention_position);
  const avgPosition = positions.length ? positions.reduce((a: number, b: number) => a + b, 0) / positions.length : 10;
  // Simple composite score based on provided stage weights (no per-stage breakdown in current schema)
  const positionScore = Math.max(0, (10 - avgPosition) / 10);
  const visibilityScore = Math.round((mentionRate * 0.7 + positionScore * 0.3) * 100);
  // Model coverage by ai_model
  const byModel: Record<string, { total: number; mentioned: number; avgPosSum: number; avgPosCount: number }>= {};
  for (const t of tests) {
    const k = t.ai_model || 'unknown';
    byModel[k] ||= { total: 0, mentioned: 0, avgPosSum: 0, avgPosCount: 0 };
    byModel[k].total += 1;
    if (t.company_mentioned) {
      byModel[k].mentioned += 1;
      if ((t.mention_position ?? 0) > 0) { byModel[k].avgPosSum += t.mention_position; byModel[k].avgPosCount += 1; }
    }
  }
  const modelCoverage: Record<string, any> = {};
  for (const [model, m] of Object.entries(byModel)) {
    modelCoverage[model] = {
      mentionRate: m.total ? m.mentioned / m.total : 0,
      avgPosition: m.avgPosCount ? m.avgPosSum / m.avgPosCount : null,
    };
  }
  // Big movers (top gains/losses) – compute by comparing latest vs earlier in week
  const byPrompt = new Map<string, any[]>();
  for (const t of tests) {
    const key = t.prompt_text || t.prompt_id || 'unknown';
    if (!byPrompt.has(key)) byPrompt.set(key, []);
    byPrompt.get(key)!.push(t);
  }
  const movers = [] as { id: string; delta: number; reason: string }[];
  for (const [id, arr] of byPrompt.entries()) {
    const sorted = arr.sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const base = (first.company_mentioned ? (11 - (first.mention_position || 10)) : 0);
    const now = (last.company_mentioned ? (11 - (last.mention_position || 10)) : 0);
    const delta = now - base;
    const reason = String(last.mention_context || '');
    movers.push({ id: String(id), delta, reason });
  }
  const biggest_wins = movers.filter(m => m.delta > 0).sort((a,b)=> b.delta - a.delta).slice(0,5);
  const biggest_losses = movers.filter(m => m.delta < 0).sort((a,b)=> a.delta - b.delta).slice(0,5);
  return { mentionRate, avgPosition, visibilityScore, modelCoverage, movers: { wins: biggest_wins, losses: biggest_losses } };
}

function computeWoWDelta(curr: number, prev: number | null): number {
  if (!prev || prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function computeWinStreak(snapshots: any[], currentScore: number): number {
  let streak = 0;
  let last = currentScore;
  for (const s of snapshots) {
    if (typeof s.visibility_score !== 'number') break;
    if (last >= s.visibility_score) streak += 1; else break;
    last = s.visibility_score;
  }
  return streak;
}

function forecastNext(scores: number[]): number {
  if (!scores.length) return 0;
  const alpha = 0.5; // simple EWMA
  let f = scores[0];
  for (let i = 1; i < scores.length; i++) {
    f = alpha * scores[i] + (1 - alpha) * f;
  }
  return Math.round(f);
}

async function upsertSnapshot(payload: any) {
  const res = await fetch(`${url}/rest/v1/weekly_snapshots`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const companyIds = await listCompaniesToProcess();
    for (const companyId of companyIds) {
      try {
        const company = await getCompany(companyId);
        const prompts = [
          `best ${company.industry} providers`,
          `top ${company.industry} companies`,
          `${company.industry} comparison guide`
        ];
        for (const p of prompts) {
          const result = await callTester({
            prompt: p,
            companyName: company.company_name,
            industry: company.industry,
            description: company.description,
            differentiators: company.key_differentiators
          });
          await insertTest(companyId, p, result);
        }

        // Compute weekly snapshot for this company
        const now = new Date();
        const week_start = startOfWeek(now);
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setUTCDate(now.getUTCDate() - 7 * 8);
        const tests = await fetchAiTests(companyId, eightWeeksAgo.toISOString());
        // bucket by week
        const byWeek = new Map<string, any[]>();
        for (const t of tests) {
          const ws = startOfWeek(new Date(t.test_date));
          if (!byWeek.has(ws)) byWeek.set(ws, []);
          byWeek.get(ws)!.push(t);
        }
        // sort weeks ascending
        const weeks = Array.from(byWeek.keys()).sort();
        const priorSnapshots: any[] = [];
        for (const ws of weeks) {
          const weekTests = byWeek.get(ws)!;
          const m = computeMetrics(weekTests);
          // previous snapshot score (if any)
          const prevScore = priorSnapshots.length ? priorSnapshots[priorSnapshots.length - 1].visibility_score : null;
          const wow = computeWoWDelta(m.visibilityScore, prevScore);
          const scoresForForecast = priorSnapshots.map(s => s.visibility_score).concat([m.visibilityScore]).slice(-6);
          const fc = forecastNext(scoresForForecast);
          const win_streak = computeWinStreak(priorSnapshots.slice().reverse(), m.visibilityScore);
          const snapshot = {
            brand_id: companyId,
            week_start: ws,
            visibility_score: m.visibilityScore,
            wow_delta: wow,
            mention_rate: m.mentionRate,
            avg_position: m.avgPosition,
            model_coverage: m.modelCoverage,
            win_streak,
            forecast: fc,
            biggest_wins: m.movers.wins,
            biggest_losses: m.movers.losses,
          };
          await upsertSnapshot(snapshot);
          priorSnapshots.push(snapshot);
        }

        // Alerts dispatcher removed (v2 minimal scope)
      } catch (e) {
        console.error('company error', companyId, e);
      }
    }
    return new Response(JSON.stringify({ ok: true, processed: companyIds.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

