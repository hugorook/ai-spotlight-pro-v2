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

  const promptGenerationRequest = `Generate 10 realistic search prompts that would cause AI models to recommend lists of companies, including ${companyInfo.companyName}.

Company Information:
- Name: ${companyInfo.companyName}
- Industry: ${companyInfo.industry}
- Description: ${companyInfo.description || 'Not provided'}
- Target Customers: ${companyInfo.targetCustomers || 'Not specified'}
- Key Differentiators: ${companyInfo.keyDifferentiators || 'Not specified'}

CRITICAL: Focus on prompts that generate LISTS OF COMPANIES as responses, not just advice or how-to content.

Requirements:
1. Create prompts that AI models respond to with "Here are the best companies..." or "Top providers include..."
2. Mix difficulty levels: 3-4 "easy wins" (broad, likely to mention the company), 3-4 "moderate" searches, and 3 "challenging" (very specific/competitive)
3. Include location-based searches when relevant
4. Use ranking language: "best", "top 10", "leading", "recommended"
5. Be specific about use cases, company size, budget, or industry verticals

Examples of GOOD prompts (that generate company lists):
- "Best ${companyInfo.industry} companies for small businesses under 100 employees"
- "Top 10 ${companyInfo.industry} providers in [relevant location]"
- "Most recommended ${companyInfo.industry} solutions for [specific use case]"
- "Best alternatives to [major competitor] for ${companyInfo.industry}"
- "Leading ${companyInfo.industry} companies for [budget range]"
- "Top-rated ${companyInfo.industry} providers with [specific feature]"

Examples of BAD prompts (don't generate company lists):
- "How to choose ${companyInfo.industry} software"
- "What features to look for in ${companyInfo.industry}"
- "Common mistakes in ${companyInfo.industry}"

Return JSON with this structure:
{
  "prompts": [
    {
      "id": "prompt-1",
      "text": "actual search query that will generate company recommendations",
      "category": "easy-win|moderate|challenging",
      "intent": "brief explanation of what company list this should generate"
    }
  ]
}

Focus on searches that make AI models say "Here are the top companies..." or "I recommend these providers..."`;

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
          content: 'You are an expert in search behavior and AI model responses. Generate realistic search queries that would prompt AI models to recommend lists of companies. Focus on queries that result in "Here are the best companies..." or "Top providers include..." responses. Mix easy wins, moderate difficulty, and challenging prompts based on competitiveness and specificity.'
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