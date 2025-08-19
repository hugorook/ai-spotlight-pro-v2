// Supabase Edge Function: generate-prompts
// Deploy: supabase functions deploy generate-prompts --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface GeneratePromptsRequest {
  companyName: string;
  industry: string;
  description?: string;
  targetCustomers?: string;
  keyDifferentiators?: string;
  websiteUrl?: string;
}

interface GeneratedPrompt {
  id: string;
  text: string;
  category: 'easy-win' | 'moderate' | 'challenging';
  intent: string;
}

async function generateRealisticPrompts(companyInfo: GeneratePromptsRequest): Promise<GeneratedPrompt[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const promptGenerationRequest = `COMPANY: ${companyInfo.companyName} in ${companyInfo.industry}

TARGET: Generate 10 search prompts that result in AI models listing ${companyInfo.companyName} among company recommendations.

MANDATORY FORMAT: Every prompt must ask for company lists using phrases like:
- "Best [X] companies for [Y]"
- "Top 10 [X] providers in [Y]" 
- "Leading [X] companies that [Y]"
- "Most recommended [X] solutions for [Y]"
- "Which [X] companies should I choose for [Y]"

CATEGORIES (use exactly these):
- "easy-win": Broad industry searches (4 prompts)
- "moderate": Specific use cases (4 prompts)  
- "challenging": Very niche/competitive (2 prompts)

EXAMPLES FOR ${companyInfo.industry}:
✅ "Best ${companyInfo.industry} companies for small businesses under $1M revenue"
✅ "Top 10 ${companyInfo.industry} providers for international shipping"
✅ "Which ${companyInfo.industry} companies offer the fastest delivery times"
✅ "Most reliable ${companyInfo.industry} partners for food manufacturers"

❌ NEVER CREATE: "How to", "What are", "Best practices for", "Strategies to"

JSON FORMAT (EXACT):
{
  "prompts": [
    {
      "id": "prompt-1",
      "text": "[company list question]",
      "category": "easy-win",
      "intent": "Generate list of top providers in category"
    },
    {
      "id": "prompt-2", 
      "text": "[company list question]",
      "category": "moderate",
      "intent": "Generate list for specific use case"
    }
  ]
}`;

  console.log('Generating realistic search prompts...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You are a customer search expert. Generate search queries that force AI models to respond with numbered lists of companies. Every prompt must result in responses like "Here are the top 10 companies:" or "Best providers include: 1. CompanyA 2. CompanyB". Focus on searches that customers actually make when comparing and selecting business providers. Avoid how-to or advice queries.'
        },
        { role: 'user', content: promptGenerationRequest },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Prompt generation failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  console.log('Raw AI response:', responseText);
  
  try {
    const parsed = JSON.parse(responseText);
    const prompts = parsed.prompts || [];
    
    console.log('Parsed prompts:', JSON.stringify(prompts, null, 2));
    
    // Validate and clean up prompts
    const validatedPrompts = prompts.slice(0, 10).map((prompt: any, index: number) => ({
      id: prompt.id || `prompt-${index + 1}`,
      text: prompt.text || 'Generated prompt',
      category: ['easy-win', 'moderate', 'challenging'].includes(prompt.category) 
        ? prompt.category 
        : 'moderate',
      intent: prompt.intent || 'User is looking for company recommendations'
    }));
    
    console.log(`Generated ${validatedPrompts.length} realistic search prompts`);
    return validatedPrompts;
    
  } catch (parseError) {
    console.error('Failed to parse prompt generation response:', responseText);
    throw new Error(`Invalid prompt generation response: ${parseError.message}`);
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
    console.log('generate-prompts request:', { 
      companyName: body.companyName,
      industry: body.industry 
    });
    
    if (!body.companyName || !body.industry) {
      throw new Error('Missing required fields: companyName and industry');
    }
    
    const prompts = await generateRealisticPrompts(body);
    
    console.log('generate-prompts completed successfully');
    return new Response(JSON.stringify({ prompts }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('generate-prompts error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      prompts: [] // Return empty array as fallback
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});