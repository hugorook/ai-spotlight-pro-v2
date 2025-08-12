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
    const { prompt } = await req.json();
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set');
    }
    
    console.log('Generating realistic AI response for:', prompt);
    
    // First, generate what a real AI would actually say
    const realResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are ChatGPT. Answer the user\'s question exactly as you normally would, mentioning specific companies only if they are genuinely relevant and well-known.' 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    
    if (!realResponse.ok) {
      throw new Error(`OpenAI API error: ${realResponse.status}`);
    }
    
    const realData = await realResponse.json();
    const actualAIResponse = realData?.choices?.[0]?.message?.content || '';
    
    console.log('Real AI response:', actualAIResponse);
    
    return new Response(
      JSON.stringify({ 
        prompt: prompt,
        actualResponse: actualAIResponse,
        analysis: {
          length: actualAIResponse.length,
          mentionsCompanies: actualAIResponse.toLowerCase().includes('company') || 
                           actualAIResponse.toLowerCase().includes('business') ||
                           actualAIResponse.toLowerCase().includes('brand'),
          isGeneral: !actualAIResponse.match(/[A-Z][a-z]+ (Inc|LLC|Corp|Company|Ltd)/g)
        }
      }), 
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
    
  } catch (e) {
    console.error('verify-ai-realism error:', e);
    return new Response(
      JSON.stringify({ 
        error: e instanceof Error ? e.message : String(e)
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});