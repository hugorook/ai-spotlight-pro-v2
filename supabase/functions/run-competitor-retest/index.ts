// Supabase Edge Function: run-competitor-retest
// Deploy: supabase functions deploy run-competitor-retest --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function listCompaniesNeedingRetest() {
  const res = await fetch(`${url}/rest/v1/schedules?monthly_competitor_retest=eq.true`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error('Failed to read schedules');
  const schedules = await res.json();
  return schedules.map((s: any) => s.company_id as string);
}

async function getCompetitors(companyId: string) {
  const res = await fetch(`${url}/rest/v1/companies?id=eq.${companyId}&select=company_name,competitors`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error('Failed to read company');
  const [company] = await res.json();
  return company as { company_name: string; competitors: string[] };
}

async function callTester(input: { prompt: string; competitor: string; industry?: string }) {
  const res = await fetch(`${url}/functions/v1/test-competitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function insertTest(companyId: string, competitor: string, prompt: string, result: any) {
  const body = [{
    company_id: companyId,
    ai_model: 'openai-gpt-4o-mini',
    company_mentioned: false,
    mention_position: result.position || 0,
    sentiment: result.sentiment || 'neutral',
    response_text: '',
    prompt_text: prompt,
    competitors_mentioned: [competitor],
    test_date: new Date().toISOString(),
  }];
  const res = await fetch(`${url}/rest/v1/ai_tests`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const companyIds = await listCompaniesNeedingRetest();
    let total = 0;
    for (const companyId of companyIds) {
      try {
        const { company_name, competitors } = await getCompetitors(companyId);
        for (const comp of competitors || []) {
          const prompt = `best ${company_name} alternatives`;
          const res = await callTester({ prompt, competitor: comp });
          await insertTest(companyId, comp, prompt, res);
          total += 1;
        }
      } catch (e) {
        console.error('company error', companyId, e);
      }
    }
    return new Response(JSON.stringify({ ok: true, inserted: total }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

