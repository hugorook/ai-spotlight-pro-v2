// Supabase Edge Function: test-ai-models
// Deploy: supabase functions deploy test-ai-models --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function evaluatePrompt(input: {
  prompt: string;
  companyName: string;
  industry?: string;
  description?: string;
  differentiators?: string;
}) {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable not set');
    throw new Error('OPENAI_API_KEY not set');
  }
  
  const sys =
    'You are simulating how ChatGPT, Claude, or similar AI assistants would ACTUALLY respond to user prompts. '
    + 'Be completely honest and realistic - only mention companies that would genuinely appear in a real AI response. '
    + 'Return STRICT JSON with keys: mentioned (boolean), position (integer 1-10 where 1=first mentioned, 0=not mentioned), '
    + "sentiment ('positive'|'neutral'|'negative'), context (brief explanation of why mentioned/not mentioned). No extra text.";
  const user = `User asks: "${input.prompt}"\n\nEvaluate this company:\nCompany: ${input.companyName}\nIndustry: ${input.industry ?? ''}\nDescription: ${input.description ?? ''}\nKey Differentiators: ${input.differentiators ?? ''}\n\nWould this company actually be mentioned in a realistic AI response to this question? Consider:\n- Is this company well-known enough to be mentioned?\n- Does it directly address what the user is asking?\n- Would a real AI assistant include it in their response?\n\nBe honest - most companies should NOT be mentioned for most prompts.`;

  console.log('Calling OpenAI API with model: gpt-4o-mini');
  console.log('System prompt:', sys);
  console.log('User prompt for evaluation:', user);
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('OpenAI API error:', { status: res.status, statusText: res.statusText, body: errorText });
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
  }
  
  const data = await res.json();
  console.log('OpenAI API response:', { usage: data.usage, model: data.model });
  
  const text = data?.choices?.[0]?.message?.content ?? '{}';
  console.log('OpenAI response content:', text);
  
  if (!text || text.trim() === '{}') {
    throw new Error('OpenAI returned empty response');
  }
  
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response as JSON:', text);
    throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
  }
  
  const result = {
    mentioned: !!parsed.mentioned,
    position: Number(parsed.position) || 0,
    sentiment: (parsed.sentiment ?? 'neutral') as 'positive' | 'neutral' | 'negative',
    context: String(parsed.context ?? ''),
  };
  
  console.log('Processed result:', result);
  return result;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  
  try {
    const body = await req.json();
    console.log('test-ai-models request:', { 
      prompt: body.prompt?.substring(0, 100) + '...', 
      companyName: body.companyName,
      industry: body.industry 
    });
    
    // Validate required fields
    if (!body.prompt || !body.companyName) {
      throw new Error('Missing required fields: prompt and companyName');
    }
    
    const result = await evaluatePrompt(body);
    console.log('test-ai-models result:', result);
    
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    console.error('test-ai-models error:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: e instanceof Error ? e.stack : undefined
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

