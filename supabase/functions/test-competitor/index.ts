// Supabase Edge Function: test-competitor
// Deploy: supabase functions deploy test-competitor --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function evaluateCompetitor(input: { prompt: string; competitor: string; industry?: string }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const sys =
    'You evaluate whether a named competitor would be listed by an AI assistant for a buyer prompt. '
    + 'Return STRICT JSON: mentioned (boolean), position (integer 0-10 where 0 means not listed), '
    + "sentiment ('positive'|'neutral'|'negative'), context (<=140 chars).";
  const user = `Buyer prompt: ${input.prompt}\nCompetitor: ${input.competitor}\nIndustry: ${input.industry ?? ''}`;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
  return {
    mentioned: !!parsed.mentioned,
    position: Number(parsed.position) || 0,
    sentiment: (parsed.sentiment ?? 'neutral') as 'positive' | 'neutral' | 'negative',
    context: String(parsed.context ?? ''),
  };
}

async function insertAiTest(companyId: string, competitor: string, prompt: string, result: any) {
  const body = [{
    company_id: companyId,
    ai_model: 'openai-gpt-4o-mini',
    company_mentioned: false,
    mention_position: result.position || 0,
    sentiment: result.sentiment || 'neutral',
    mention_context: result.context || '',
    response_text: '',
    prompt_text: prompt,
    competitors_mentioned: [competitor],
    test_date: new Date().toISOString(),
  }];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_tests`, {
    method: 'POST',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { companyId, competitor, industry, prompt } = await req.json();
    const p = prompt || `best ${industry ?? ''} providers`;
    const result = await evaluateCompetitor({ prompt: p, competitor, industry });
    if (companyId) await insertAiTest(companyId, competitor, p, result);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});

