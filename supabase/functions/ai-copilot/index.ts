// Supabase Edge Function: ai-copilot
// Deploy with: supabase functions deploy ai-copilot
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function askOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are AI Copilot for an AI Visibility analytics app. Be concise, actionable, and suggest one-click next steps.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ?? null;
  } catch (e) {
    console.error('OpenAI error', e);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { question, contextPath } = await req.json();
    const q = (question ?? '').toString().trim();
    const ctx = contextPath ? `Context: ${contextPath}` : '';
    const prompt = `${ctx}\nUser question: ${q || 'Suggest next actions to improve AI visibility.'}\nReturn concise guidance with 2-3 bullets and 1-2 next actions.`;

    const ai = await askOpenAI(prompt);
    const fallback = `Copilot${contextPath ? ` for ${contextPath}` : ''}:\n- Run Health Check\n- Review Heatmap\n- Create a content brief`;

    const body = { answer: ai ?? fallback };
    return new Response(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});

