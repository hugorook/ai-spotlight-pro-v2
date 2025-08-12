// Supabase Edge Function: generate-content
// Deploy: supabase functions deploy generate-content --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  try {
    const { companyName, industry, targetCustomers, differentiators, topic } = await req.json();
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

    const sys = 'You create concise, structured marketing briefs. Output Markdown with Title, Intro, Key points (5 bullets), and CTA.';
    const user = `Company: ${companyName}\nIndustry: ${industry}\nCustomers: ${targetCustomers}\nDifferentiators: ${differentiators}\nTopic: ${topic}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
        temperature: 0.5,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ title: topic, content }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});

