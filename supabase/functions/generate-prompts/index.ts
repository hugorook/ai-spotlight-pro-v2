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

  console.log('Generating prompts from saved company fields only...');

  // Step A: Extract structured capabilities from saved company fields only
  const extractPrompt = `Extract structured JSON fields from the following company information.

Company: ${companyInfo.companyName}
Industry: ${companyInfo.industry}
Description: ${companyInfo.description ?? ''}
Target Customers: ${companyInfo.targetCustomers ?? ''}
Key Differentiators: ${companyInfo.keyDifferentiators ?? ''}

Return JSON only with keys:
{
  "services": ["specific services they offer"],
  "segments": ["types of customers/industries they serve"],
  "markets": ["geographies if any"],
  "useCases": ["specific problems solved / use cases"],
  "keywords": ["short keywords relevant for search prompts"]
}`;

  let extracted: { services: string[]; segments: string[]; markets: string[]; useCases: string[]; keywords: string[] } = { services: [], segments: [], markets: [], useCases: [], keywords: [] };

  if (OPENAI_API_KEY) {
    try {
      const exRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return ONLY strict JSON with the requested keys.' },
            { role: 'user', content: extractPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });
      if (exRes.ok) {
        const exData = await exRes.json();
        const exText = exData?.choices?.[0]?.message?.content ?? '{}';
        try {
          const parsed = JSON.parse(exText);
          extracted = {
            services: Array.isArray(parsed.services) ? parsed.services : [],
            segments: Array.isArray(parsed.segments) ? parsed.segments : [],
            markets: Array.isArray(parsed.markets) ? parsed.markets : [],
            useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          };
        } catch {}
      }
    } catch (e) {
      console.warn('Capability extraction failed', e);
    }
  }

  const make = (text: string, idx: number, category: GeneratedPrompt['category'] = 'moderate'): GeneratedPrompt => ({ id: `prompt-${idx + 1}`, text, category, intent: 'User is looking for company recommendations' });
  const uniq = (arr: string[]) => Array.from(new Set(arr.map(s => s.trim()))).filter(Boolean);

  const listPhr = ['Best', 'Top 10', 'Leading'];
  const ensureListStyle = (t: string) => (/companies|providers|vendors|consultants|agencies|firms/i.test(t) ? t : `${t} companies`);

  const candidates: string[] = [];
  const services = uniq(extracted.services).slice(0, 6);
  const segments = uniq(extracted.segments).slice(0, 6);
  const markets = uniq(extracted.markets).slice(0, 4);
  const useCases = uniq(extracted.useCases).slice(0, 6);

  for (const s of services) {
    candidates.push(`${listPhr[0]} ${s} providers`);
    if (segments[0]) candidates.push(`${listPhr[1]} ${s} companies for ${segments[0]}`);
    if (useCases[0]) candidates.push(`${listPhr[2]} companies that provide ${s} for ${useCases[0]}`);
    if (markets[0]) candidates.push(`${listPhr[1]} ${s} vendors in ${markets[0]}`);
  }
  for (const seg of segments.slice(0, 3)) {
    candidates.push(`${listPhr[0]} providers for ${seg}`);
  }
  for (const uc of useCases.slice(0, 2)) {
    candidates.push(`Which companies offer solutions for ${uc}?`);
  }

  let programmatic = uniq(candidates)
    .map(ensureListStyle)
    .filter(t => !/^(how to|what|best practices|benefits|why)\b/i.test(t));

  // Add highly specific, successful prompts that are more likely to mention the company
  const highValuePrompts: string[] = [];
  
  // Create ultra-specific prompts using exact company name and location context
  if (companyInfo.companyName && segments[0]) {
    highValuePrompts.push(`Companies like ${companyInfo.companyName} for ${segments[0]}`);
  }
  if (companyInfo.companyName && services[0]) {
    highValuePrompts.push(`${companyInfo.companyName} competitors in ${services[0]}`);
    highValuePrompts.push(`Alternative companies to ${companyInfo.companyName}`);
  }
  if (companyInfo.companyName && useCases[0]) {
    highValuePrompts.push(`Best companies for ${useCases[0]} similar to ${companyInfo.companyName}`);
  }
  
  // Add these high-value prompts to the programmatic list
  programmatic = [...highValuePrompts, ...programmatic];
  
  // If we already got enough programmatic prompts, return those
  if (programmatic.length >= 8) {
    programmatic = programmatic.slice(0, 12); // Increased to 12 to include high-value prompts
    return programmatic.map((t, i) => make(t, i, i < 2 ? 'easy-win' : i < 6 ? 'moderate' : 'challenging'));
  }

  const promptGenerationRequest = `ANALYZE THIS COMPANY AND GENERATE SEARCH PROMPTS:

Company: ${companyInfo.companyName}
Industry: ${companyInfo.industry}
Description: ${companyInfo.description || 'Not provided'}
Target Customers: ${companyInfo.targetCustomers || 'Not provided'}
Key Differentiators: ${companyInfo.keyDifferentiators || 'Not provided'}

TASK: Based on the company information above, create 12 search prompts that would result in AI models recommending ${companyInfo.companyName} in company lists. Make some prompts HIGHLY SPECIFIC to increase success rate.

STRATEGY: Mix broad category searches with ultra-specific queries:
- Include competitor comparison prompts ("alternatives to [company]", "companies like [company]")
- Use exact company name in some prompts for direct comparison requests
- Target their specific customer segments and use cases
- Include geographic context when available

MANDATORY: Every prompt must generate a numbered list of companies:
- "Best [specific service] companies for [specific need]"
- "Top [number] [specific solution] providers in [location/industry]"
- "Companies like ${companyInfo.companyName} for [specific use case]"
- "${companyInfo.companyName} competitors in [specific market]"
- "Alternative companies to ${companyInfo.companyName}"
- "Which companies offer [specific solution] for [specific problem]"

CATEGORIES (exact spelling):
- "easy-win": Broad category + competitor comparison prompts (4 prompts)
- "moderate": Specific use case + targeted industry prompts (6 prompts)  
- "challenging": Ultra-specific niche requirements (2 prompts)

EXAMPLES of HIGH-SUCCESS prompts:
- "Companies like ${companyInfo.companyName} for [their target market]"
- "${companyInfo.companyName} alternatives for [specific use case]"
- "Best [their service] providers similar to ${companyInfo.companyName}"

❌ BANNED: "How to", "What are", "Best practices", "Benefits of", "Why"

JSON FORMAT (EXACTLY 12 prompts):
{
  "prompts": [
    {
      "id": "prompt-1",
      "text": "Companies like ${companyInfo.companyName} for [target market]",
      "category": "easy-win",
      "intent": "Find direct competitors and alternatives"
    },
    {
      "id": "prompt-2", 
      "text": "${companyInfo.companyName} competitors in [industry/service]",
      "category": "easy-win",
      "intent": "Generate competitive landscape list"
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
  
  const isListQuery = (t: string) => /companies|providers|vendors|consultants|agencies|firms/i.test(t) || /which\s+.*companies/i.test(t) || /^(best|top|leading)\b/i.test(t);
  const isBanned = (t: string) => /^(how to|what|best practices|benefits|why)\b/i.test(t);

  try {
    const parsed = JSON.parse(responseText);
    let prompts = parsed.prompts || [];

    // Normalize + validate (expect 12 prompts)
    let validatedPrompts: GeneratedPrompt[] = prompts.slice(0, 24).map((prompt: any, index: number) => ({
      id: prompt.id || `prompt-${index + 1}`,
      text: String(prompt.text || '').trim(),
      category: ['easy-win', 'moderate', 'challenging'].includes(prompt.category)
        ? prompt.category
        : 'moderate',
      intent: String(prompt.intent || 'User is looking for company recommendations')
    }));

    // Filter out generic prompts; require list-style queries
    validatedPrompts = validatedPrompts.filter(p => p.text && !isBanned(p.text) && isListQuery(p.text));

    // If too few remain, run a second strictly constrained pass to rewrite into list queries
    if (validatedPrompts.length < 10) {
      console.log(`Only ${validatedPrompts.length} valid prompts; requesting strict rewrite...`);
      const strictPrompt = `Rewrite and return EXACTLY 12 JSON prompts in the same schema, but ONLY list-style queries that will return numbered lists of companies for ${companyInfo.companyName}. 

INCLUDE HIGH-SUCCESS PROMPTS:
- "Companies like ${companyInfo.companyName} for [use case]"
- "${companyInfo.companyName} competitors in [market]"
- "Alternative companies to ${companyInfo.companyName}"
- "Best [service] providers similar to ${companyInfo.companyName}"

And traditional list prompts starting with 'Best', 'Top', 'Leading', or 'Which companies'. MUST include words like companies/providers/vendors/consultants/agencies/firms. 
Use the provided company information and avoid any 'how to', 'what', or advisory phrasing.`;

      const strictRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON in the provided schema.' },
            { role: 'user', content: `${promptGenerationRequest}\n\n${strictPrompt}` },
          ],
          temperature: 0.2,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        }),
      });

      if (strictRes.ok) {
        const strictData = await strictRes.json();
        const strictText = strictData?.choices?.[0]?.message?.content ?? '{}';
        try {
          const strictParsed = JSON.parse(strictText);
          let strictPrompts: GeneratedPrompt[] = (strictParsed.prompts || []).map((p: any, i: number) => ({
            id: p.id || `prompt-${i + 1}`,
            text: String(p.text || '').trim(),
            category: ['easy-win', 'moderate', 'challenging'].includes(p.category) ? p.category : 'moderate',
            intent: String(p.intent || 'User is looking for company recommendations')
          }));
          strictPrompts = strictPrompts.filter(p => p.text && !isBanned(p.text) && isListQuery(p.text));
          if (strictPrompts.length >= validatedPrompts.length) {
            validatedPrompts = strictPrompts;
          }
        } catch (e) {
          console.warn('Strict rewrite parse failed:', e);
        }
      } else {
        console.warn('Strict rewrite request failed');
      }
    }

    // Cap to 12 for more variety and higher success rate
    validatedPrompts = validatedPrompts.slice(0, 12);
    console.log(`Returning ${validatedPrompts.length} validated prompts`);
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