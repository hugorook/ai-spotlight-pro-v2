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
  category: 'problem-solving' | 'comparison' | 'recommendation' | 'how-to' | 'best-practices';
  intent: string;
}

async function generateRealisticPrompts(companyInfo: GeneratePromptsRequest): Promise<GeneratedPrompt[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const promptGenerationRequest = `Generate 10 realistic search prompts that potential customers would actually type when looking for solutions in this space.

Company Information:
- Name: ${companyInfo.companyName}
- Industry: ${companyInfo.industry}
- Description: ${companyInfo.description || 'Not provided'}
- Target Customers: ${companyInfo.targetCustomers || 'Not specified'}
- Key Differentiators: ${companyInfo.keyDifferentiators || 'Not specified'}

Requirements:
1. Think like real users with real problems
2. Use natural language people actually search with
3. Include specific pain points and use cases
4. Mix different search intents: problem-solving, comparisons, recommendations, how-to guides
5. Avoid generic industry terms - be specific about what users need

Examples of GOOD prompts:
- "How to reduce customer churn in SaaS without increasing support costs"
- "Best project management tools for remote teams under 50 people"
- "Why is my e-commerce conversion rate dropping and how to fix it"
- "Cheapest way to automate accounting for small business"

Examples of BAD prompts (too generic):
- "Best software companies"
- "Top industry providers"
- "Software comparison guide"

Return JSON with this structure:
{
  "prompts": [
    {
      "id": "prompt-1",
      "text": "actual search query",
      "category": "problem-solving|comparison|recommendation|how-to|best-practices",
      "intent": "brief explanation of user intent"
    }
  ]
}

Focus on what real customers with real budgets and real deadlines would search for.`;

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
          content: 'You are an expert in search behavior and customer journey mapping. Generate realistic search queries that actual potential customers would use when looking for business solutions. Focus on specific problems, not generic industry searches.'
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
      category: ['problem-solving', 'comparison', 'recommendation', 'how-to', 'best-practices'].includes(prompt.category) 
        ? prompt.category 
        : 'problem-solving',
      intent: prompt.intent || 'User is looking for solutions'
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