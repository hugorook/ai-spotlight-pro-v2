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

async function analyzeWebsiteForPrompts(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Visibility-Bot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Basic HTML parsing to extract text content
    let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract text from common content tags
    const contentRegex = /<(?:p|h[1-6]|div|span|article|section)[^>]*>(.*?)<\/(?:p|h[1-6]|div|span|article|section)>/gi;
    const matches = [...cleanHtml.matchAll(contentRegex)];
    
    let textContent = matches
      .map(match => match[1].replace(/<[^>]*>/g, ' ').trim())
      .filter(text => text.length > 10)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
      
    // Limit content size
    if (textContent.length > 3000) {
      textContent = textContent.substring(0, 3000) + '...';
    }
    
    return textContent;
  } catch (error) {
    console.error('Website analysis failed:', error);
    return '';
  }
}

async function generateRealisticPrompts(companyInfo: GeneratePromptsRequest): Promise<GeneratedPrompt[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  // Analyze website to understand what company actually does
  let websiteContent = '';
  if (companyInfo.websiteUrl) {
    console.log('Analyzing website:', companyInfo.websiteUrl);
    websiteContent = await analyzeWebsiteForPrompts(companyInfo.websiteUrl);
  }

  const promptGenerationRequest = `ANALYZE THIS COMPANY AND GENERATE SEARCH PROMPTS:

Company: ${companyInfo.companyName}
Website Content: ${websiteContent || 'No website provided'}
Industry: ${companyInfo.industry}
Description: ${companyInfo.description || 'Not provided'}

TASK: Based on the actual website content above, understand what this company SPECIFICALLY does and create 10 search prompts that would result in AI models recommending ${companyInfo.companyName} in company lists.

CRITICAL: Ignore generic industry labels. Use the WEBSITE CONTENT to understand:
- What specific services they offer
- What types of clients they serve  
- What problems they solve
- What makes them unique

MANDATORY: Every prompt must generate a numbered list of companies:
- "Best [specific service] companies for [specific need]"
- "Top [number] [specific solution] providers in [location/industry]"
- "Leading companies that [specific capability]"
- "Most recommended [service] for [use case]"
- "Which companies offer [specific solution] for [specific problem]"

CATEGORIES (exact spelling):
- "easy-win": Broad service category (4 prompts)
- "moderate": Specific use case/problem (4 prompts)  
- "challenging": Very specific/niche requirement (2 prompts)

EXAMPLES (based on what they ACTUALLY do):
- If they do cold storage: "Best cold storage companies for pharmaceutical distribution"
- If they do logistics: "Top 10 last-mile delivery providers for food retailers"
- If they do consulting: "Leading supply chain consultants for manufacturing companies"

❌ BANNED: "How to", "What are", "Best practices", "Benefits of", "Why"

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