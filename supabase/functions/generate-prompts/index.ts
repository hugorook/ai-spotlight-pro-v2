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
  geographicFocus?: string;
  specificServices?: string[];
  industryNiches?: string[];
  technologies?: string[];
  companySizes?: string[];
  locations?: string[];
  uniqueCombinations?: string[];
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
Geographic Focus: ${companyInfo.geographicFocus ?? 'Global'}
Specific Services: ${JSON.stringify(companyInfo.specificServices || [])}
Industry Niches: ${JSON.stringify(companyInfo.industryNiches || [])}
Technologies: ${JSON.stringify(companyInfo.technologies || [])}
Company Sizes Served: ${JSON.stringify(companyInfo.companySizes || [])}
Locations: ${JSON.stringify(companyInfo.locations || [])}

Return JSON only with keys:
{
  "services": ["specific services they offer"],
  "segments": ["types of customers/industries they serve"],
  "markets": ["geographies if any"],
  "useCases": ["specific problems solved / use cases"],
  "keywords": ["short keywords relevant for search prompts"],
  "niches": ["specific industry niches or specializations"],
  "technologies": ["specific technologies or methodologies"],
  "uniqueCombos": ["rare service+market+tech combinations"]
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

  // Create ULTRA-SPECIFIC "easy win" prompts using detailed analysis (NO company name mentions)
  const specificPrompts: string[] = [];
  const niches = uniq(extracted.niches || []).slice(0, 6);
  const techs = uniq(extracted.technologies || []).slice(0, 5);
  // Prioritize current geographic focus over cached locations
  const currentGeo = companyInfo.geographicFocus || 'Global';
  const locations = uniq([currentGeo].concat(companyInfo.locations || []).concat(markets)).slice(0, 5);
  const compSizes = uniq((companyInfo.companySizes || [])).slice(0, 4);
  
  // Filter out location-specific prompts if geographic focus is "Global"
  const useLocationSpecific = currentGeo !== 'Global' && currentGeo.toLowerCase() !== 'global';
  
  // Strategy 1: ULTRA-NICHE queries (so specific only a few companies would qualify)
  for (const niche of niches.slice(0, 2)) {
    if (useLocationSpecific && locations[0]) {
      specificPrompts.push(`${niche} companies in ${locations[0]}`);
    } else {
      specificPrompts.push(`Leading ${niche} specialists`);
    }
    if (segments[0] && useLocationSpecific && locations[1]) {
      specificPrompts.push(`Top ${niche} specialists in ${locations[1]} for ${segments[0]}`);
    } else if (segments[0]) {
      specificPrompts.push(`Top ${niche} specialists for ${segments[0]}`);
    }
  }
  
  // Strategy 2: Technology + Geographic + Customer combinations (very narrow)
  for (const tech of techs.slice(0, 2)) {
    if (useLocationSpecific && locations[0] && segments[0]) {
      specificPrompts.push(`${tech} companies in ${locations[0]} serving ${segments[0]}`);
    } else if (segments[0]) {
      specificPrompts.push(`${tech} companies serving ${segments[0]}`);
    }
    if (useLocationSpecific && useCases[0] && locations[1]) {
      specificPrompts.push(`Best ${tech} providers for ${useCases[0]} in ${locations[1]}`);
    } else if (useCases[0]) {
      specificPrompts.push(`Best ${tech} providers for ${useCases[0]}`);
    }
  }
  
  // Strategy 3: Service + Multiple Qualifiers (maximum specificity)
  for (const service of services.slice(0, 2)) {
    if (useLocationSpecific && locations[0] && compSizes[0]) {
      specificPrompts.push(`${service} companies in ${locations[0]} specializing in ${compSizes[0]}`);
    } else if (compSizes[0]) {
      specificPrompts.push(`${service} companies specializing in ${compSizes[0]}`);
    }
    if (segments[0] && techs[0]) {
      specificPrompts.push(`${service} providers using ${techs[0]} for ${segments[0]}`);
    }
  }
  
  // Strategy 4: Award/Recognition-style queries (implies expertise)
  if (services[0]) {
    if (useLocationSpecific && locations[0]) {
      specificPrompts.push(`Most recognized ${services[0]} firms in ${locations[0]}`);
      specificPrompts.push(`Award-winning ${services[0]} companies in ${locations[0]}`);
    } else {
      specificPrompts.push(`Most recognized ${services[0]} firms`);
      specificPrompts.push(`Award-winning ${services[0]} companies`);
    }
  }
  
  // Strategy 5: Problem-specific queries (very targeted)
  for (const useCase of useCases.slice(0, 2)) {
    if (useLocationSpecific && locations[0]) {
      specificPrompts.push(`Companies solving ${useCase} in ${locations[0]}`);
    } else {
      specificPrompts.push(`Companies solving ${useCase}`);
    }
    if (techs[0]) {
      specificPrompts.push(`${techs[0]} companies specializing in ${useCase}`);
    }
  }
  
  // Strategy 6: Use unique combinations for maximum specificity 
  const uniqueCombos = uniq(extracted.uniqueCombos || []).concat(companyInfo.uniqueCombinations || []).slice(0, 3);
  for (const combo of uniqueCombos) {
    specificPrompts.push(`Companies specializing in ${combo}`);
    specificPrompts.push(`Leading providers of ${combo}`);
  }
  
  // Strategy 7: Award/expertise-based ultra-niche queries
  if (niches[0] && techs[0]) {
    specificPrompts.push(`Award-winning ${niches[0]} companies using ${techs[0]}`);
  }
  if (services[0] && niches[0]) {
    if (useLocationSpecific && locations[0]) {
      specificPrompts.push(`Most recognized ${services[0]} experts in ${niches[0]} based in ${locations[0]}`);
    } else {
      specificPrompts.push(`Most recognized ${services[0]} experts in ${niches[0]}`);
    }
  }
  
  // Add these ultra-specific prompts to the programmatic list
  programmatic = [...specificPrompts, ...programmatic];
  
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

TASK: Based on the detailed company information above, create 12 ULTRA-SPECIFIC search prompts that are genuine "easy wins" - so niche that only a handful of companies (including ${companyInfo.companyName}) would qualify. NO company name mentions allowed.

STRATEGY: Create queries so specific they're almost like describing the company without naming them:
- Use UNIQUE combinations that few companies have: [rare specialization] + [specific geography] + [exact customer type] + [unique methodology]
- Example: "blockchain supply chain companies in Singapore specializing in luxury goods authentication for mid-market retailers"
- Include award/recognition language: "most recognized", "award-winning", "leading experts in"
- Use problem-specific queries: "companies solving [exact problem] in [specific market]"
- Target their exact unique selling points and rare combinations
- Make prompts so niche that generic competitors wouldn't qualify
- Each prompt should describe a market where they'd naturally be mentioned

MANDATORY: Every prompt must generate a numbered list of companies (NO company name mentions). Use ULTRA-SPECIFIC structures:
- "Award-winning [niche service] companies in [city] specializing in [exact problem] for [precise customer type]"
- "Most recognized [technology + methodology] providers in [market] serving [specific industry vertical]"
- "Companies solving [exact challenge] in [geographic region] using [specific approach]"
- "Leading experts in [super-niche specialization] for [detailed customer segment] in [location]"
- "[Rare technology combination] companies in [specific market] focusing on [unique use case]"
- "Top-rated [service] specialists in [location] with [specific certification/capability]"
- "Which companies offer [ultra-specific solution] for [precise problem] in [niche market]"
- "Best [methodology] providers specializing in [industry niche] + [geography] + [customer size]"

CATEGORIES (exact spelling):
- "easy-win": Broad category + competitor comparison prompts (4 prompts)
- "moderate": Specific use case + targeted industry prompts (6 prompts)  
- "challenging": Ultra-specific niche requirements (2 prompts)

EXAMPLES of ULTRA-SPECIFIC "easy win" prompts:
- "Award-winning algorithmic sugar commodity trading companies in London specializing in hedge fund risk management" 
- "Machine learning supply chain optimization companies in Germany serving automotive Tier 1 suppliers"
- "Pharmaceutical temperature-controlled logistics specialists in European markets with IoT monitoring capabilities"
- "Blockchain supply chain tracking companies in Singapore focusing on luxury goods authentication for mid-market retailers"
- "Most recognized Series A SaaS marketing automation platforms for B2B tech startups with AI-powered lead scoring"
- "Companies solving renewable energy project finance challenges in Southeast Asia emerging markets"
- "Leading experts in cryptocurrency exchange security infrastructure for institutional trading platforms"
- "AI-powered fraud detection companies specializing in cross-border e-commerce transactions for fintech startups"

❌ BANNED: "How to", "What are", "Best practices", "Benefits of", "Why"

JSON FORMAT (EXACTLY 12 prompts):
{
  "prompts": [
    {
      "id": "prompt-1",
      "text": "Best [specific service] companies in [location]",
      "category": "easy-win",
      "intent": "Find specialized providers in specific geography"
    },
    {
      "id": "prompt-2", 
      "text": "Top [industry niche] specialists for [customer segment]",
      "category": "easy-win",
      "intent": "Generate niche provider list"
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
      const strictPrompt = `Rewrite and return EXACTLY 12 JSON prompts in the same schema, but ONLY list-style queries that will return numbered lists of companies. NO COMPANY NAME MENTIONS ALLOWED.

CREATE HIGHLY SPECIFIC and DIVERSE prompts combining multiple elements:
- "Best [specific service] companies in [location] for [customer type]" 
- "Top [technology + methodology] providers specializing in [industry niche]"
- "Leading [detailed specialization] companies serving [specific segment] in [market]"
- "Which [specific solution] companies focus on [precise use case] for [customer size]"
- "[Specific technology] specialists for [industry vertical] in [geographic area]"

Must start with 'Best', 'Top', 'Leading', 'Which companies', or '[Technology] specialists'. MUST include words like companies/providers/vendors/consultants/agencies/firms. 
Be ULTRA-SPECIFIC combining service + location + customer segment (like "algorithmic sugar commodity trading companies in London for hedge funds" not "commodity traders"). 
MAKE EACH PROMPT UNIQUE - avoid repetitive patterns. Use ALL the detailed company information provided.`;

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