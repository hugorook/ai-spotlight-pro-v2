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

  // Step A: Extract clean, specific capabilities from saved company fields only
  const extractPrompt = `Extract clean, specific JSON fields from the following company information. IMPORTANT: Return only SHORT, CLEAN terms - no full sentences or company descriptions.

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

RETURN ONLY SHORT, CLEAN TERMS (2-4 words max each):

Examples:
- Services: ["commodity trading", "risk management", "supply chain finance"] NOT ["physical commodity sourcing solutions with tailored procurement strategies"]
- Segments: ["agricultural producers", "food processors", "hedge funds"] NOT ["mid-market agricultural producers with $10M-$100M revenue"]
- Niches: ["sugar trading", "coffee sourcing", "grain logistics"] NOT full descriptions

Return JSON only with SHORT terms:
{
  "services": ["short service 1", "short service 2"],
  "segments": ["customer type 1", "customer type 2"],
  "markets": ["geography 1", "geography 2"],
  "useCases": ["use case 1", "use case 2"],
  "keywords": ["keyword1", "keyword2"],
  "niches": ["niche 1", "niche 2"],
  "technologies": ["tech 1", "tech 2"],
  "uniqueCombos": ["combo 1", "combo 2"]
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
          // Clean and filter extracted data to remove corrupted entries
          const cleanArray = (arr: any[], companyName: string) => {
            if (!Array.isArray(arr)) return [];
            return arr
              .filter(item => typeof item === 'string' && item.length < 100) // Filter out overly long corrupted entries
              .map(item => item.trim())
              .filter(item => 
                item.length > 0 && 
                !item.toLowerCase().includes(companyName.toLowerCase()) && // Remove entries containing company name
                !item.includes(' in ') && // Remove entries with location phrases
                !item.includes(' operates ') && // Remove operational descriptions
                !item.includes('companies') && // Remove entries that already contain 'companies'
                !item.includes('providers') &&
                !item.includes('firms')
              )
              .slice(0, 8); // Limit to prevent bloat
          };
          
          extracted = {
            services: cleanArray(parsed.services || [], companyInfo.companyName),
            segments: cleanArray(parsed.segments || [], companyInfo.companyName),
            markets: cleanArray(parsed.markets || [], companyInfo.companyName),
            useCases: cleanArray(parsed.useCases || [], companyInfo.companyName),
            keywords: cleanArray(parsed.keywords || [], companyInfo.companyName),
            niches: cleanArray(parsed.niches || [], companyInfo.companyName),
            technologies: cleanArray(parsed.technologies || [], companyInfo.companyName),
            uniqueCombos: cleanArray(parsed.uniqueCombos || [], companyInfo.companyName),
          };
        } catch (parseError) {
          console.warn('Failed to parse extraction result:', parseError);
        }
      }
    } catch (e) {
      console.warn('Capability extraction failed', e);
    }
  }

  const make = (text: string, idx: number, category: GeneratedPrompt['category'] = 'moderate'): GeneratedPrompt => ({ id: `prompt-${idx + 1}`, text, category, intent: 'User is looking for company recommendations' });
  const uniq = (arr: string[]) => Array.from(new Set(arr.map(s => s.trim()))).filter(Boolean);
  
  // Clean extracted data to remove any corrupted entries
  const cleanExtracted = {
    ...extracted,
    services: (extracted.services || []).filter(s => 
      s.length < 50 && 
      !s.toLowerCase().includes(companyInfo.companyName.toLowerCase()) &&
      !s.includes(' in ') &&
      !s.includes('operates')
    ),
    segments: (extracted.segments || []).filter(s => 
      s.length < 50 && 
      !s.toLowerCase().includes(companyInfo.companyName.toLowerCase())
    ),
    niches: (extracted.niches || []).filter(s => 
      s.length < 50 && 
      !s.toLowerCase().includes(companyInfo.companyName.toLowerCase())
    ),
    technologies: (extracted.technologies || []).filter(s => 
      s.length < 50 && 
      !s.toLowerCase().includes(companyInfo.companyName.toLowerCase())
    )
  };

  const listPhr = ['Best', 'Top 10', 'Leading'];
  const ensureListStyle = (t: string) => (/companies|providers|vendors|consultants|agencies|firms/i.test(t) ? t : `${t} companies`);

  const candidates: string[] = [];
  const services = uniq(cleanExtracted.services).slice(0, 6);
  const segments = uniq(cleanExtracted.segments).slice(0, 6);
  const markets = uniq(cleanExtracted.markets).slice(0, 4);
  const useCases = uniq(cleanExtracted.useCases).slice(0, 6);

  // Create business-specific combinations that show market understanding
  for (const service of services.slice(0, 3)) {
    if (segments[0]) {
      candidates.push(`Companies providing ${service} for ${segments[0]}`);
      candidates.push(`${service} specialists serving ${segments[0]}`);
    }
    if (useCases[0]) {
      candidates.push(`Companies offering ${service} to solve ${useCases[0]}`);
    }
  }
  
  // Create customer-focused prompts
  for (const segment of segments.slice(0, 3)) {
    if (services[0]) {
      candidates.push(`${services[0]} companies specializing in ${segment}`);
    }
    candidates.push(`Specialized service providers for ${segment}`);
  }
  
  // Create problem-solution focused prompts
  for (const useCase of useCases.slice(0, 2)) {
    candidates.push(`Companies solving ${useCase} challenges`);
    if (segments[0]) {
      candidates.push(`Which companies help ${segments[0]} with ${useCase}`);
    }
  }

  let programmatic = uniq(candidates)
    .map(ensureListStyle)
    .filter(t => !/^(how to|what|best practices|benefits|why)\b/i.test(t));

  // Create ULTRA-SPECIFIC "easy win" prompts using detailed analysis (NO company name mentions)
  const specificPrompts: string[] = [];
  const niches = uniq(cleanExtracted.niches || []).slice(0, 6);
  const techs = uniq(cleanExtracted.technologies || []).slice(0, 5);
  // Prioritize current geographic focus over cached locations
  const currentGeo = companyInfo.geographicFocus || 'Global';
  const locations = uniq([currentGeo].concat(companyInfo.locations || []).concat(markets)).slice(0, 5);
  const compSizes = uniq((companyInfo.companySizes || [])).slice(0, 4);
  
  // Filter out location-specific prompts if geographic focus is "Global"
  const useLocationSpecific = currentGeo !== 'Global' && currentGeo.toLowerCase() !== 'global';
  
  // Strategy 1: Business-model specific queries that show market understanding
  for (const niche of niches.slice(0, 2)) {
    if (segments[0]) {
      specificPrompts.push(`Companies specializing in ${niche} for ${segments[0]}`);
      if (useLocationSpecific && locations[0]) {
        specificPrompts.push(`${niche} specialists in ${locations[0]} serving ${segments[0]}`);
      }
    } else {
      specificPrompts.push(`Leading ${niche} specialists`);
    }
  }
  
  // Strategy 2: Value proposition + Customer combinations
  for (const tech of techs.slice(0, 2)) {
    if (segments[0] && useCases[0]) {
      specificPrompts.push(`Companies using ${tech} to help ${segments[0]} with ${useCases[0]}`);
    } else if (segments[0]) {
      specificPrompts.push(`${tech} specialists serving ${segments[0]}`);
    }
    if (services[0]) {
      specificPrompts.push(`${services[0]} companies with ${tech} capabilities`);
    }
  }
  
  // Strategy 3: Customer-problem-solution combinations
  for (const service of services.slice(0, 2)) {
    if (compSizes[0] && useCases[0]) {
      specificPrompts.push(`${service} companies helping ${compSizes[0]} with ${useCases[0]}`);
    }
    if (segments[0] && niches[0]) {
      specificPrompts.push(`${service} specialists in ${niches[0]} for ${segments[0]}`);
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
  const uniqueCombos = uniq(cleanExtracted.uniqueCombos || []).concat(companyInfo.uniqueCombinations || []).slice(0, 3);
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

TASK: Based on the company information above, create 12 HIGHLY SPECIFIC search prompts that reflect deep understanding of their actual business model and unique market position. NO company name mentions allowed.

STRATEGY: Create prompts that show you understand EXACTLY what they do and how they're different:
- Focus on their SPECIFIC business model, not generic industry categories
- Use their ACTUAL customer types, commodity focuses, and unique approaches
- Include their SPECIFIC value proposition and methodology
- Target the EXACT problems they solve for their specific customers
- Example: Instead of "commodity trading companies" → "companies providing structured finance and risk management for family-owned sugar mills in Brazil"
- Example: Instead of "supply chain companies" → "direct-trade coffee sourcing companies with farmer partnership programs serving specialty roasters"
- Make each prompt reflect their specific competitive advantage and market positioning
- Think: "What would someone search for who specifically needs what this company uniquely offers?"

MANDATORY: Every prompt must generate a numbered list of companies (NO company name mentions). Use BUSINESS-SPECIFIC structures that reflect actual market understanding:
- "Companies providing [specific business model/approach] for [exact customer type] in [specific market context]"
- "[Specific commodity/product] trading firms with [unique capability] serving [actual customer profile]"
- "[Service type] companies specializing in [specific market segment] with [unique value proposition]"
- "Which companies offer [specific business solution] for [exact customer challenge] in [particular market]"
- "[Industry] specialists with [unique approach/methodology] for [specific customer type]"
- "Companies with [specific expertise/relationships] serving [particular market segment]"
- "[Service] providers with [specific competitive advantage] in [particular geographic/sector focus]"
- "Leading [specific specialization] companies with [unique capability] for [exact customer needs]"

CATEGORIES (exact spelling):
- "easy-win": Broad category + competitor comparison prompts (4 prompts)
- "moderate": Specific use case + targeted industry prompts (6 prompts)  
- "challenging": Ultra-specific niche requirements (2 prompts)

EXAMPLES of BUSINESS-SPECIFIC prompts that show deep understanding:

For a sugar trading company like Czarnikow:
- "Companies providing structured finance and risk management for sugar mills in Brazil and Central America"
- "Sugar trading firms with direct producer relationships and price risk mitigation services"
- "Commodity trading houses specializing in sugar ethanol complex with logistics integration"
- "Agricultural commodity finance companies serving family-owned mills in Latin America"

For a coffee sourcing company:
- "Direct-trade coffee sourcing companies with farmer partnership programs serving specialty roasters"
- "Coffee supply chain companies providing quality premiums and sustainability certification"
- "Specialty coffee importers with origin relationships and cupping expertise"

For a tech company:
- "B2B SaaS platforms with API-first architecture serving mid-market e-commerce companies"
- "Marketing automation tools with advanced segmentation for subscription business models"

These show ACTUAL BUSINESS UNDERSTANDING, not generic industry terms.

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