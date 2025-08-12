// Supabase Edge Function: run-health-check
// Deploy: supabase functions deploy run-health-check --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function listCompaniesNeedingHealthCheck() {
  const res = await fetch(`${url}/rest/v1/schedules?weekly_health_check=eq.true`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error('Failed to read schedules');
  const schedules = await res.json();
  return schedules.map((s: any) => s.company_id as string);
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

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const companyIds = await listCompaniesNeedingHealthCheck();
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
      } catch (e) {
        console.error('company error', companyId, e);
      }
    }
    return new Response(JSON.stringify({ ok: true, processed: companyIds.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

