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

  const promptGenerationRequest = `You are ${companyInfo.companyName}, a company in ${companyInfo.industry}. Generate 10 search prompts that would cause AI models to recommend YOUR company in a list of providers/solutions.

Company Details:
- Name: ${companyInfo.companyName}
- Industry: ${companyInfo.industry}
- Description: ${companyInfo.description || 'Not provided'}
- Target Customers: ${companyInfo.targetCustomers || 'Not specified'}
- Key Differentiators: ${companyInfo.keyDifferentiators || 'Not specified'}

CRITICAL OBJECTIVE: Create prompts where AI models would naturally list ${companyInfo.companyName} among recommended companies.

Requirements:
1. Each prompt MUST generate a numbered list of companies as the response
2. Think like a customer who needs what ${companyInfo.companyName} offers
3. Use specific business scenarios, company sizes, budgets, locations where relevant
4. Mix difficulty: 4 "easy wins" (broad category), 4 "moderate" (specific needs), 2 "challenging" (very niche/competitive)
5. Include terms that force list responses: "best", "top 5", "leading", "recommended companies"

GOOD prompt examples that generate company lists:
- "Top 10 ${companyInfo.industry} companies for startups in 2024"
- "Best ${companyInfo.industry} providers for companies with $1M+ revenue"  
- "Most recommended ${companyInfo.industry} companies in [specific region]"
- "Leading ${companyInfo.industry} solutions for [specific industry vertical]"
- "Best alternatives to [major competitor] for ${companyInfo.industry}"
- "Top-rated ${companyInfo.industry} companies with [specific feature]"
- "Which ${companyInfo.industry} companies should I consider for [use case]?"

BAD examples (generate advice, not company lists):
- "How to choose ${companyInfo.industry} software" ❌
- "What to look for in ${companyInfo.industry}" ❌  
- "Benefits of ${companyInfo.industry}" ❌

Think: "If someone searched this, would ChatGPT respond with a numbered list that includes ${companyInfo.companyName}?"

Return JSON:
{
  "prompts": [
    {
      "id": "prompt-1", 
      "text": "search query that generates a list including ${companyInfo.companyName}",
      "category": "easy-win|moderate|challenging",
      "intent": "what type of company list this should generate"
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
      temperature: 0.7,
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
  
  try {
    const parsed = JSON.parse(responseText);
    const prompts = parsed.prompts || [];
    
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