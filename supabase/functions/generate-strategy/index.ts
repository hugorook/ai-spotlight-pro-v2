// Supabase Edge Function: generate-strategy
// Deploy: supabase functions deploy generate-strategy --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

type CondensedResult = {
  prompt_text?: string;
  company_mentioned?: boolean;
  mention_position?: number | null;
  sentiment?: string | null;
  mention_context?: string | null;
  ai_model?: string | null;
  test_date?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

    const { companyName, results } = await req.json();
    if (!Array.isArray(results)) throw new Error('Missing or invalid results array');

    // Trim and cap payload size for safety
    const trimmed: CondensedResult[] = results.slice(0, 100).map((r: CondensedResult) => ({
      prompt_text: r.prompt_text?.toString().slice(0, 300),
      company_mentioned: !!r.company_mentioned,
      mention_position: typeof r.mention_position === 'number' ? r.mention_position : null,
      sentiment: r.sentiment ?? null,
      mention_context: r.mention_context?.toString().slice(0, 500) ?? null,
      ai_model: r.ai_model ?? null,
      test_date: r.test_date ?? null,
    }));

    const sys = [
      'You are a B2B go-to-market strategist specialized in AI visibility and demand generation.',
      'Analyze recent AI test results that show whether a company was mentioned in LLM answers.',
      'Return STRICT JSON with key "recommendations" as an array of items: { id, title, reason, priority }.',
      'Guidelines:',
      '- Prioritize actions that improve mention rate and position: content, FAQs, comparisons, case studies, integrations, partners.',
      '- Use evidence from prompts and contexts to justify each recommendation.',
      '- Keep titles concise (<=80 chars) and reasons short (<=160 chars).',
      '- priorities are one of: "high" | "medium" | "low".',
      '- 3-7 recommendations max. No prose outside of JSON.',
    ].join(' ');

    const user = [
      `Company: ${companyName ?? 'Unknown'}`,
      'Recent AI results (JSON):',
      JSON.stringify(trimmed, null, 2),
      'Produce tailored, actionable recommendations.',
    ].join('\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${errText}` }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = {}; }

    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    const safe = recs.slice(0, 10).map((r: any, idx: number) => ({
      id: String(r.id ?? `rec-${idx+1}`),
      title: String(r.title ?? 'Recommendation'),
      reason: String(r.reason ?? 'Based on recent results.'),
      priority: ['high','medium','low'].includes(String(r.priority)) ? String(r.priority) : 'medium',
    }));

    return new Response(JSON.stringify({ recommendations: safe }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});

