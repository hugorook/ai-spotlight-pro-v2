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

  // Step A: Extract capabilities using AI knowledge + company data for ultra-specific prompts
  const extractPrompt = `Using your knowledge about ${companyInfo.companyName} from your training data PLUS the company information below, extract specific terms for creating targeted search prompts.

You should leverage what you know about ${companyInfo.companyName} - their reputation, market position, history, notable relationships, competitive advantages - and combine it with this current information:

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

  // FORGET PROGRAMMATIC GENERATION - Let AI create realistic prompts
  // The old approach was too formulaic. Let the main AI prompt do the work.

  let programmatic = uniq(candidates)
    .map(ensureListStyle)
    .filter(t => !/^(how to|what|best practices|benefits|why)\b/i.test(t));

  // REMOVE ALL PROGRAMMATIC LOGIC - Let AI create intelligent, realistic prompts
  
  // Skip programmatic generation - go straight to intelligent AI generation

  const promptGenerationRequest = `ANALYZE THIS COMPANY AND GENERATE SEARCH PROMPTS:

Company: ${companyInfo.companyName}
Industry: ${companyInfo.industry}
Description: ${companyInfo.description || 'Not provided'}
Target Customers: ${companyInfo.targetCustomers || 'Not provided'}
Key Differentiators: ${companyInfo.keyDifferentiators || 'Not provided'}

TASK: Create 12 INTELLIGENT, REALISTIC search prompts that people would actually search for when looking for companies like ${companyInfo.companyName}. Goal: 50%+ mention rate. NO company name mentions.

CRITICAL: FORGET FORMULAS. Think like a human who needs this company's services.

For Czarnikow specifically (major sugar trading house):
- Someone at a sugar mill might search: "sugar trading companies that provide financing"
- A food manufacturer might search: "sugar suppliers with price risk management"
- An investor might search: "largest sugar trading houses globally"
- A procurement manager might search: "sugar trading companies with Brazilian operations"

KEY PRINCIPLES:
1. What would their ACTUAL CUSTOMERS search for?
2. What problems do they solve that people would Google?
3. What makes them famous/notable in their industry?
4. What would competitors, customers, or analysts search for?
5. Think: "If I needed what they offer, what would I actually type into Google?"

CREATE PROMPTS PEOPLE WOULD REALISTICALLY SEARCH:
- "Best sugar trading companies for [specific need]"
- "Sugar trading houses with [specific capability]"
- "Commodity traders specializing in [specific area]"
- "Companies that [specific service they're known for]"

NO MORE TEMPLATES. Think like a real person searching for real business solutions.

MANDATORY: Create prompts that real people would actually search for when they need this company's services:

- Think like a CUSTOMER: "Best [service] companies for [my specific need]"
- Think like a RESEARCHER: "Top [industry] companies with [specific capability]"
- Think like a COMPETITOR: "Leading [market] players in [geographic area]"
- Think like an ANALYST: "Largest [service] providers globally"
- Think like a PROCUREMENT MANAGER: "[Service] companies with [specific feature/capability]"

FORGET TEMPLATES. Each prompt should sound like something a real person would type into Google when they have a genuine business need.

Examples of REALISTIC searches:
- "Sugar trading companies that finance mills" (not "companies providing structured finance for agricultural producers")
- "Best commodity traders in Brazil" (not "leading trading specialists serving producers")
- "Largest sugar trading houses globally" (not "established firms with market reputation")

CATEGORIES (exact spelling):
- "easy-win": Broad category + competitor comparison prompts (4 prompts)
- "moderate": Specific use case + targeted industry prompts (6 prompts)  
- "challenging": Ultra-specific niche requirements (2 prompts)

EXAMPLES of REALISTIC prompts that real people would search for:

For Czarnikow (major sugar trading house):
- "Largest sugar trading companies in the world"
- "Sugar trading houses that provide mill financing"
- "Best sugar commodity traders with Brazilian operations"
- "Sugar trading companies with price risk management services"
- "Major commodity traders specializing in sugar and ethanol"
- "Sugar trading firms with direct mill relationships"
- "Companies that trade sugar and provide working capital"
- "Global sugar trading houses with logistics capabilities"

For a SaaS company:
- "Best marketing automation platforms for B2B companies"
- "SaaS companies with advanced segmentation features"
- "Marketing automation tools for mid-market businesses"

For a consulting firm:
- "Top supply chain consulting firms"
- "Management consultants specializing in operations"

Key: Think like a REAL PERSON who needs their services and would Google for solutions.

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
      const strictPrompt = `Create EXACTLY 12 realistic search prompts that real people would type into Google when looking for companies like ${companyInfo.companyName}. Goal: 50%+ mention rate. NO COMPANY NAME MENTIONS.

CRITICAL: Think like a REAL PERSON with a genuine business need.

For ${companyInfo.companyName} specifically:
- What would their customers actually search for?
- What problems do they solve that people would Google?
- What makes them notable in their industry?
- What would procurement managers, analysts, or competitors search for?

CREATE REALISTIC SEARCH QUERIES:
- "Best [their main service] companies" 
- "[Their industry] companies with [specific capability they're known for]"
- "Largest [their market] companies globally"
- "[Service] providers with [geographic focus]"
- "Companies that [specific thing they do well]"

NO MORE FORMULAIC PATTERNS. Each prompt should sound like genuine human search behavior.

Example transformation:
❌ "Established supply chain solutions firms with market reputation"
✅ "Best sugar trading companies with mill financing"

Make prompts so specific to what they actually do that AI naturally thinks of them.`;

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