// Supabase Edge Function: test-ai-models
// Deploy: supabase functions deploy test-ai-models --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function getActualAIResponse(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  console.log('Getting actual AI response for prompt:', prompt);
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Answer the user\'s question naturally and comprehensively.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('OpenAI API error getting response:', { status: res.status, statusText: res.statusText, body: errorText });
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
  }
  
  const data = await res.json();
  const response = data?.choices?.[0]?.message?.content ?? '';
  console.log('Got AI response:', response.substring(0, 200) + '...');
  
  return response;
}

async function analyzeResponse(input: {
  prompt: string;
  response: string;
  companyName: string;
  industry?: string;
  description?: string;
  differentiators?: string;
  websiteUrl?: string;
}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }
  
  const sys =
    'You are analyzing an AI response to determine if a target company is mentioned. '
    + 'Count as a mention if: the exact brand name appears, a common misspelling/variant appears, OR the company website/domain appears (with or without www./http). '
    + 'Determine: 1) mentioned (boolean), 2) position (1-10 where 1 = first mentioned, 0 = not mentioned), 3) sentiment, 4) context.'
    + " Return STRICT JSON: { \"mentioned\": boolean, \"position\": number, \"sentiment\": 'positive'|'neutral'|'negative', \"context\": string }.";
    
  const user = `Original prompt: "${input.prompt}"\n\nAI Response to analyze:\n"${input.response}"\n\nCompany to look for:\nCompany: ${input.companyName}\nIndustry: ${input.industry ?? ''}\nDescription: ${input.description ?? ''}\nKey Differentiators: ${input.differentiators ?? ''}\nKnown website/domain: ${input.websiteUrl ?? ''}\n\nRules: Treat an explicit brand name or clear website/domain reference (including variations like www., https, or bare domain) as a mention.\n\nAnalyze this ACTUAL AI response - is the company mentioned by name or clearly referenced? What position? What sentiment?`;

  console.log('Analyzing response for company mentions');
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
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
    console.error('OpenAI API error analyzing response:', { status: res.status, statusText: res.statusText, body: errorText });
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
  }
  
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '{}';
  console.log('Analysis result:', text);
  
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    console.error('Failed to parse analysis as JSON:', text);
    throw new Error(`Invalid JSON response from analysis: ${parseError.message}`);
  }
  
  return {
    mentioned: !!parsed.mentioned,
    position: Number(parsed.position) || 0,
    sentiment: (parsed.sentiment ?? 'neutral') as 'positive' | 'neutral' | 'negative',
    context: String(parsed.context ?? ''),
  };
}

async function evaluatePrompt(input: {
  prompt: string;
  companyName: string;
  industry?: string;
  description?: string;
  differentiators?: string;
  websiteUrl?: string;
}) {
  try {
    // Step 1: Get the actual AI response to the prompt
    console.log('Step 1: Getting actual AI response...');
    const actualResponse = await getActualAIResponse(input.prompt);
    
    if (!actualResponse || actualResponse.trim().length === 0) {
      throw new Error('Empty response from AI');
    }
    
    // Step 2: Analyze that response for company mentions
    console.log('Step 2: Analyzing response for company mentions...');
    const analysis = await analyzeResponse({
      prompt: input.prompt,
      response: actualResponse,
      companyName: input.companyName,
      industry: input.industry,
      description: input.description,
      differentiators: input.differentiators,
      websiteUrl: input.websiteUrl
    });
    
    // Heuristic fallback: simple string check to avoid false negatives
    const normalizedResponse = actualResponse.toLowerCase();
    const normalizedName = input.companyName.toLowerCase();
    const nameStripped = normalizedName.replace(/[^a-z0-9\s]/gi, '').trim();
    const mentionedByString = normalizedResponse.includes(normalizedName) || (nameStripped && normalizedResponse.includes(nameStripped));
    // Check domain presence as a mention as well
    let mentionedByDomain = false;
    if (input.websiteUrl) {
      try {
        const url = new URL(input.websiteUrl.startsWith('http') ? input.websiteUrl : `https://${input.websiteUrl}`);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        mentionedByDomain = normalizedResponse.includes(host);
      } catch {}
    }
    const finalMentioned = analysis.mentioned || mentionedByString || mentionedByDomain;
    const finalPosition = analysis.position || (mentionedByString ? 1 : 0);

    // Return both the original response and the consolidated analysis
    const result = {
      mentioned: finalMentioned,
      position: finalPosition,
      sentiment: analysis.sentiment,
      context: analysis.context,
      response: actualResponse
    };
    
    console.log('Final result:', { 
      mentioned: result.mentioned, 
      position: result.position, 
      sentiment: result.sentiment,
      contextLength: result.context.length,
      responseLength: result.response.length 
    });
    
    return result;
  } catch (error) {
    console.error('Error in evaluatePrompt:', error);
    throw error;
  }
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

