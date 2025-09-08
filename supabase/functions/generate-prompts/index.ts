// Supabase Edge Function: generate-prompts
// Deploy: supabase functions deploy generate-prompts --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface GeneratePromptsRequest {
  companyName?: string;
  industry?: string;
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
  requestedCount?: number;
}

interface GeneratedPrompt {
  id: string;
  text: string;
  category: 'easy-win' | 'moderate' | 'challenging' | 'trending';
  intent: string;
}


async function generateRealisticPrompts(companyInfo: GeneratePromptsRequest): Promise<GeneratedPrompt[]> {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable not set');
    throw new Error('OPENAI_API_KEY not configured. Please check environment variables.');
  }

  // If only URL is provided, analyze the website first
  if (companyInfo.websiteUrl && !companyInfo.companyName) {
    console.log('Analyzing website to extract company information...');
    
    try {
      const websiteAnalysisPrompt = `Analyze this company: ${companyInfo.websiteUrl}

Using your knowledge about this company AND what you can infer from their domain/URL, provide DETAILED, SPECIFIC information:

1. Company name
2. SPECIFIC industry/niche (not just "technology" - be precise like "due diligence research", "background verification", "regulatory compliance software")
3. DETAILED description of their core services/products
4. SPECIFIC target customers (not just "businesses" - be specific like "private equity firms", "law firms", "financial institutions")
5. UNIQUE differentiators/USPs that set them apart from competitors
6. Key services they're known for
7. Their main value proposition

Be SPECIFIC and DETAILED. If this is Xapien, mention due diligence research, background checks, regulatory compliance, automated research, etc.

Return ONLY JSON format:
{
  "companyName": "Company Name",
  "industry": "Specific industry/niche",
  "description": "Detailed description of core services",
  "targetCustomers": "Specific customer types",
  "keyDifferentiators": "Unique advantages and specializations",
  "coreServices": "Main services they provide",
  "valueProposition": "What problem they solve uniquely"
}`;

      const analysisRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert at analyzing websites and extracting company information. Use your knowledge of companies and analyze the URL provided to extract accurate company details.' },
            { role: 'user', content: websiteAnalysisPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        const analysisText = analysisData?.choices?.[0]?.message?.content ?? '{}';
        try {
          const parsed = JSON.parse(analysisText);
          companyInfo.companyName = parsed.companyName || 'Unknown Company';
          companyInfo.industry = parsed.industry || 'Technology';
          companyInfo.description = parsed.description || '';
          companyInfo.targetCustomers = parsed.targetCustomers || '';
          companyInfo.keyDifferentiators = `${parsed.keyDifferentiators || ''} ${parsed.coreServices || ''} ${parsed.valueProposition || ''}`.trim();
          console.log('Extracted detailed company info:', parsed);
        } catch (parseError) {
          console.warn('Failed to parse website analysis:', parseError);
          throw new Error('Could not analyze website. Please check the URL is valid and accessible.');
        }
      } else {
        throw new Error('Failed to analyze website. Please check the URL is valid.');
      }
    } catch (error) {
      console.error('Website analysis failed:', error);
      throw new Error('Could not analyze website. Please provide company details manually.');
    }
  }

  console.log('Generating prompts with company info:', {
    name: companyInfo.companyName,
    industry: companyInfo.industry
  });

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

TASK: Create ${companyInfo.requestedCount || 10} REALISTIC search prompts that actual customers would search for when looking for companies like ${companyInfo.companyName}. Goal: 80%+ mention rate on easy-wins. NO company name mentions.

CRITICAL: Use SPECIFIC services, capabilities, and customer types - not generic industry terms. Balance REALISTIC human searches with enough SPECIFICITY to favor established players like ${companyInfo.companyName}.

FOCUS ON THEIR SPECIFIC SERVICES: ${companyInfo.keyDifferentiators}
TARGET THEIR ACTUAL CUSTOMERS: ${companyInfo.targetCustomers}
THEIR UNIQUE NICHE: ${companyInfo.industry}

For Czarnikow specifically (major sugar trading house):
- Sugar mill owner needing capital: "sugar trading companies that provide mill financing" (realistic + financing USP)
- Food manufacturer needing risk coverage: "sugar trading firms with price risk management" (realistic + risk USP)  
- Ethanol producer: "sugar and ethanol trading companies" (realistic + integrated complex USP)
- Procurement manager needing full service: "sugar trading companies with integrated logistics" (realistic + logistics USP)

CUSTOMER-PERSPECTIVE PROMPTS (KEY STRATEGY):
Think from the perspective of their ACTUAL customers - what would these people realistically search for?
- "What would a procurement manager at Coca Cola search for when sourcing sugar globally?"
- "What would a beverage company sourcing director search for when needing international sugar supply?"
- "What would a sugar mill owner search for when needing financing and trading partnerships?"
- "What would a food manufacturer search for when needing sugar supply security and risk management?"

KEY PRINCIPLES:
1. What would their ACTUAL CUSTOMERS search for when they need their SPECIFIC value proposition?
2. Include customer-perspective prompts: "What would [specific customer type] at [realistic company] search for?"
3. Target their key differentiators/USPs in realistic search language
4. Think about customer problems that require their unique combination of services
5. Examples: "What would a sugar mill owner search for when they need both trading AND financing?"
6. "What would an ethanol producer search for when they need integrated sugar-ethanol trading?"
7. Avoid generic terms - focus on their specific value combinations

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
- "easy-win": Very specific searches combining 2-3+ capabilities that naturally favor major established players (3 prompts) - What procurement managers would search for very specific solutions
- "moderate": Service/geographic searches with moderate competition (3 prompts)  
- "challenging": Broader industry category searches with lots of competition (2 prompts)
- "trending": Current trending topics in the industry combined with company services (2 prompts)

FOR EASY WINS - MAKE THESE GENUINELY EASY:
Layer 3-4 specific capabilities + scale indicators + geography to create VERY NICHE searches that only 2-3 major companies would realistically serve:

Examples for major established players:
- "Leading [industry] companies with [capability A] + [capability B] + [capability C] in [region/global]"  
- "Major [service] firms offering [specific A] and [specific B] to [specific customer type]"
- "Global [industry] leaders with [rare combination of services] for [specific market segment]"

FOR TRENDING TOPICS:
Include current industry trends like:
- AI/automation in the industry
- Sustainability/ESG requirements
- Supply chain resilience 
- Digital transformation
- Regulatory compliance
- Climate adaptation

Examples:
- "[Industry] companies with AI-powered [service] for [trend/regulation]"  
- "Sustainable [industry] providers with [trending capability]"

AVOID SIMPLE VERSIONS like:
- "Sugar trading companies that provide mill financing" (too simple)
- "Sugar trading companies in Brazil" (too geographically narrow for a global company)
- "Major sugar trading companies globally" (lacks specificity about capabilities)

For a SaaS company:
- "Best marketing automation platforms for B2B companies"
- "What would a CMO at a tech startup search for when needing lead generation?"
- "SaaS companies with advanced segmentation features"
- "Marketing automation tools for mid-market businesses"

For a consulting firm:
- "Top supply chain consulting firms"
- "What would a operations director at Amazon search for when optimizing logistics?"
- "Management consultants specializing in operations"

ADAPT CUSTOMER EXAMPLES TO EACH COMPANY:
- For tech companies: "What would a CTO at [realistic tech company] search for?"
- For financial services: "What would a CFO at [realistic financial company] search for?"
- For manufacturing: "What would a plant manager at [realistic manufacturer] search for?"
- Always use realistic, well-known companies that would actually be customers

Key: EASY-WIN prompts should target their specific USPs/differentiators while being realistic searches.

EASY-WIN USP TARGETING - USE DETAILED, MULTI-LAYERED DESCRIPTIONS:
- Instead of "sugar trading companies" → "Leading sugar trading and supply chain companies offering mill financing and advisory services"
- Instead of "commodity traders" → "International sugar and ethanol trading companies with integrated supply chain operations"
- Instead of "sugar suppliers" → "Major sugar trading and supply chain firms with physical storage and logistics capabilities"
- Instead of "trading firms" → "Top global sugar commodity trading houses with risk management and hedging services"

KEY: Add multiple layers of detail that naturally describe established major players:
- Scale indicators: "Leading", "Major", "Top global", "International"
- Service combinations: "trading and supply chain", "financing and advisory services"
- Capability depth: "integrated operations", "physical storage and logistics", "risk management and hedging"
- Geographic scope: "international", "global", "worldwide", "with global mill relationships" (avoid being too specific to one region - these are global companies)

Think: What would a sugar mill owner search for when they need both trading AND financing?
Or: What would a food manufacturer search for when they need sugar AND risk management?

❌ BANNED: "How to", "What are", "Best practices", "Benefits of", "Why"

JSON FORMAT (EXACTLY ${companyInfo.requestedCount || 10} prompts):
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
          content: 'You are an expert at creating realistic search queries that maximize company mention rates. For "easy-win" prompts: Layer 3-4 specific capabilities + scale indicators to create VERY NICHE searches that only 2-3 major companies can realistically serve - these must be genuinely easy wins (80%+ mention rate). For "trending" prompts: Include current industry trends like AI, sustainability, supply chain resilience, digital transformation. CRITICAL: Easy wins should combine so many specific capabilities that only major established players would appear. Every prompt must result in numbered company lists.'
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
  
  const isListQuery = (t: string) => /companies|providers|vendors|consultants|agencies|firms|services|platforms|tools|solutions/i.test(t) || /which\s+.*companies/i.test(t) || /^(best|top|leading)\b/i.test(t);
  const isBanned = (t: string) => /^(how\s+to|what\s+are|what\s+is|best\s+practices|benefits\s+of|why\s+do)\b/i.test(t);

  try {
    const parsed = JSON.parse(responseText);
    let prompts = parsed.prompts || [];

    // Normalize + validate (expect 10 prompts: 3+3+2+2)
    let validatedPrompts: GeneratedPrompt[] = prompts.slice(0, 10).map((prompt: any, index: number) => ({
      id: prompt.id || `prompt-${index + 1}`,
      text: String(prompt.text || '').trim(),
      category: ['easy-win', 'moderate', 'challenging', 'trending'].includes(prompt.category)
        ? prompt.category
        : 'moderate',
      intent: String(prompt.intent || 'User is looking for company recommendations')
    }));

    // Filter out generic prompts; require list-style queries
    validatedPrompts = validatedPrompts.filter(p => p.text && !isBanned(p.text) && isListQuery(p.text));

    console.log(`After filtering: ${validatedPrompts.length} valid prompts out of ${prompts.length}`);
    if (validatedPrompts.length < prompts.length) {
      console.log('Filtered out prompts:', prompts.filter(p => !p.text || isBanned(p.text) || !isListQuery(p.text)).map(p => p.text));
    }

    // If too few remain, run a second strictly constrained pass to rewrite into list queries
    if (validatedPrompts.length < 10) {
      console.log(`Only ${validatedPrompts.length} valid prompts; requesting strict rewrite...`);
      const strictPrompt = `Create EXACTLY 10 search prompts for ${companyInfo.companyName}: 3 easy-win, 3 moderate, 2 challenging, 2 trending. Easy wins must be ULTRA-SPECIFIC for 80%+ mention rate. NO COMPANY NAME MENTIONS.

CRITICAL STRATEGY:

3 EASY-WIN prompts (must be REALISTIC but TARGETED):
- Realistic searches that procurement managers, analysts, or competitors would actually make
- Focus on their key markets, scale indicators, or service combinations that favor major players
- Target searches where established companies naturally rank high
- Examples: "Major [service] companies globally", "[service] companies in [key geographic market]", "Largest [commodity] traders", "[service] firms with [key capability]"

3 MODERATE prompts:
- Specific to their main services but broader market
- Include geographic or capability specificity but not ultra-narrow

2 CHALLENGING prompts:
- General industry category searches
- Broader competitive landscape queries

2 TRENDING prompts:
- Current industry trends (AI, sustainability, digital transformation, etc.)
- Combined with their core services

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
            category: ['easy-win', 'moderate', 'challenging', 'trending'].includes(p.category) ? p.category : 'moderate',
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

    // Must have exactly the requested number of quality prompts
    const requestedCount = companyInfo.requestedCount || 10;
    
    if (validatedPrompts.length < requestedCount) {
      throw new Error(`Only generated ${validatedPrompts.length} valid prompts, need ${requestedCount}. The AI-generated prompts were either banned or not list-style queries.`);
    }
    
    // Return exactly the requested count
    validatedPrompts = validatedPrompts.slice(0, requestedCount);
    console.log(`Returning exactly ${validatedPrompts.length} company-specific prompts`);
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
    
    if (!body.companyName && !body.industry && !body.websiteUrl) {
      throw new Error('Missing required fields: either (companyName and industry) or websiteUrl');
    }
    
    const prompts = await generateRealisticPrompts(body);
    
    // Also return the company data that was extracted/analyzed
    const companyData = {
      companyName: body.companyName,
      industry: body.industry,
      description: body.description,
      targetCustomers: body.targetCustomers,
      keyDifferentiators: body.keyDifferentiators,
      websiteUrl: body.websiteUrl
    };
    
    console.log('generate-prompts completed successfully');
    return new Response(JSON.stringify({ 
      prompts,
      companyData 
    }), { 
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