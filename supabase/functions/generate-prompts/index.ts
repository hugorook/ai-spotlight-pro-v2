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

TASK: Create 12 REALISTIC search prompts that actual customers would search for when looking for companies like ${companyInfo.companyName}. Goal: 50%+ mention rate on easy-wins. NO company name mentions.

CRITICAL: Balance REALISTIC human searches with enough SPECIFICITY to favor established players.

For Czarnikow specifically (major sugar trading house):
- Sugar mill owner might search: "sugar trading companies that provide financing" (realistic + specific value)
- Food manufacturer might search: "major sugar commodity traders" (realistic + targets leaders)  
- Analyst might search: "largest sugar trading companies globally" (realistic + scale indicator)
- Procurement manager might search: "sugar trading companies in Brazil" (realistic + geographic strength)

KEY PRINCIPLES:
1. What would their ACTUAL CUSTOMERS realistically search for?
2. Use terms that naturally favor major/established players ("major", "largest", "leading")
3. Include their key geographic markets or service combinations
4. Think: "What would a Coca-Cola procurement manager actually type into Google?"
5. Avoid artificial specificity (founding dates, years in business)

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

CATEGORIES (exact spelling) - REALISTIC but TARGETED:
- "easy-win": Realistic searches that naturally favor major established players (4 prompts) - What procurement managers, analysts, or competitors would actually search
- "moderate": Specific service/geographic searches but broader competition (4 prompts)  
- "challenging": General industry category searches with lots of competition (4 prompts)

EXAMPLES of REALISTIC prompts that real people would search for:

For Czarnikow (major sugar trading house) - REALISTIC but SPECIFIC "easy wins":
- "Major sugar trading companies globally" (realistic search, targets established players)
- "Sugar trading companies in Brazil" (real geographic need, their key market)
- "Largest sugar commodity traders" (realistic analyst/competitor search)
- "Sugar trading firms with mill financing" (real customer need they fulfill)
- "Global sugar trading houses" (realistic procurement search)
- "Sugar and ethanol trading companies" (specific to their integrated business)
- "International sugar commodity traders" (realistic B2B search)
- "Sugar trading companies with logistics services" (real value proposition)

For a SaaS company:
- "Best marketing automation platforms for B2B companies"
- "SaaS companies with advanced segmentation features"
- "Marketing automation tools for mid-market businesses"

For a consulting firm:
- "Top supply chain consulting firms"
- "Management consultants specializing in operations"

Key: EASY-WIN prompts should be realistic searches that naturally favor established major players.

EASY-WIN REALISTIC SPECIFICITY:
- Instead of "sugar trading companies" → "major sugar trading companies globally" (realistic + targets leaders)
- Instead of "commodity traders" → "largest sugar commodity traders" (realistic analyst search)
- Instead of "sugar companies" → "sugar trading companies in Brazil" (realistic geographic + their strength)
- Instead of "trading firms" → "sugar trading firms with mill financing" (realistic customer need)

Think: What would a procurement manager at Coca-Cola actually search for?

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
          content: 'You are an expert at creating realistic search queries that maximize company mention rates. Create searches that real people (procurement managers, analysts, competitors) would actually make. For "easy-win" prompts, use realistic terms that naturally favor major established players - like "major [service] companies", "largest [commodity] traders", "[service] companies in [key market]". Avoid artificial specificity. Every prompt must result in numbered company lists.'
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
      const strictPrompt = `Create EXACTLY 12 search prompts for ${companyInfo.companyName} with 4 ULTRA-SPECIFIC "easy win" prompts designed for 50%+ mention rate. NO COMPANY NAME MENTIONS.

CRITICAL STRATEGY:

4 EASY-WIN prompts (must be REALISTIC but TARGETED):
- Realistic searches that procurement managers, analysts, or competitors would actually make
- Focus on their key markets, scale indicators, or service combinations that favor major players
- Target searches where established companies naturally rank high
- Examples: "Major [service] companies globally", "[service] companies in [key geographic market]", "Largest [commodity] traders", "[service] firms with [key capability]"

4 MODERATE prompts:
- Specific to their main services but broader market
- Include geographic or capability specificity but not ultra-narrow

4 CHALLENGING prompts:
- General industry category searches
- Broader competitive landscape queries

For Czarnikow example - EASY-WIN realistic specificity:
❌ "Sugar trading companies" (too broad, hundreds of results)
✅ "Major sugar trading companies globally" (realistic search, naturally favors established leaders)
✅ "Sugar trading companies in Brazil" (real geographic need, their key strength)
✅ "Largest sugar commodity traders" (realistic analyst search, targets major players)
✅ "Sugar trading firms with mill financing" (real customer need they fulfill)

The easy-wins should be REALISTIC SEARCHES that naturally favor established market leaders like this company.`;

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