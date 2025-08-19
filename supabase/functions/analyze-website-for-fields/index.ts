// Supabase Edge Function: analyze-website-for-fields
// Deploy: supabase functions deploy analyze-website-for-fields --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface WebsiteFieldsRequest {
  url: string;
}

interface ExtractedFields {
  companyName: string;
  industry: string;
  description: string;
  targetCustomers: string;
  keyDifferentiators: string;
  geographicFocus: string;
  specificServices: string[];
  industryNiches: string[];
  technologies: string[];
  companySizes: string[];
  locations: string[];
  uniqueCombinations: string[];
}

async function fetchWebsiteContent(url: string): Promise<string> {
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
      
    // Limit content size for AI processing
    if (textContent.length > 4000) {
      textContent = textContent.substring(0, 4000) + '...';
    }
    
    return textContent;
  } catch (error) {
    console.error('Website fetch failed:', error);
    throw new Error(`Failed to fetch website: ${error.message}`);
  }
}

async function extractFieldsFromWebsite(websiteContent: string, url: string): Promise<ExtractedFields> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const extractionPrompt = `Analyze this website content and extract highly detailed, specific company information for generating targeted search prompts.

Website URL: ${url}
Website Content: ${websiteContent}

Extract the following fields with MAXIMUM DETAIL and SPECIFICITY:

1. Company Name: The actual company name (from headers, titles, etc.)

2. Industry: Be very specific about their industry niche (e.g., "B2B SaaS Marketing Automation", "Pharmaceutical Cold Chain Logistics", "Renewable Energy Project Finance")

3. Description: Write a detailed 4-5 sentence description covering:
   - EXACTLY what services/products they offer
   - HOW they deliver value (methodology, process, approach)
   - WHAT specific problems they solve
   - WHAT their key value propositions are
   - WHAT makes their offering unique

4. Target Customers: Be extremely specific about WHO they serve:
   - Exact company types (e.g., "Series A SaaS startups", "Fortune 500 manufacturing companies", "Mid-market e-commerce retailers with $10-100M revenue")
   - Specific roles/departments (e.g., "CMOs at B2B tech companies", "Supply chain directors at automotive manufacturers")
   - Industry verticals they focus on
   - Company size ranges with specifics

5. Key Differentiators: Extract ultra-specific competitive advantages that make them unique:
   - Exact proprietary methodologies or frameworks (with names/terms they use)
   - Specific patents, certifications, or industry awards (with names/years)
   - Notable client names, case studies, or partnership announcements
   - Unique technical capabilities or rare specializations
   - Specific years of experience in ultra-niche areas
   - Industry recognition, thought leadership, or media mentions
   - Rare combinations of services/expertise that few others have

6. Geographic Focus: Specific locations where they operate or serve clients

7. Specific Services: Ultra-detailed array of exact services with unique qualifiers:
   - Example: ["algorithmic sugar commodity trading with risk management", "pharmaceutical cold chain logistics with IoT monitoring", "luxury goods blockchain authentication"] NOT ["trading", "logistics"]
   - Include any proprietary service names or methodologies they mention

8. Industry Niches: Extremely specific sub-industries with unique angles:
   - Example: ["pharmaceutical temperature-controlled logistics for clinical trials", "automotive Tier 1 supplier just-in-time delivery", "luxury goods authentication for mid-market retailers"] NOT ["logistics"]
   - Capture the exact customer types within each niche

9. Technologies: Specific technologies with implementation details:
   - Example: ["machine learning price prediction for commodity trading", "blockchain supply chain tracking for luxury goods", "AI-powered fraud detection for cross-border payments"] NOT ["AI solutions"]
   - Include exact use cases or applications mentioned

10. Company Sizes: Ultra-specific company size segments with context:
    - Example: ["Series A SaaS startups with 10-50 employees", "mid-market manufacturers with $50-500M revenue in automotive sector", "Fortune 500 financial services companies"]
    - Include industry context for each size segment

11. Locations: Hyper-specific geographic markets with context:
    - Example: ["London financial district fintech companies", "Singapore luxury retail market", "California Central Valley agricultural technology", "Southeast Asia emerging fintech markets"]
    - Include the business context for each location

12. Unique Combinations: Rare service/market combinations that few competitors have:
    - Example: ["blockchain + luxury goods + Singapore", "AI + commodity trading + hedge funds", "IoT + pharmaceutical + cold chain"]
    - These ultra-specific combinations will create the best "easy win" prompts

Return ONLY valid JSON with ULTRA-SPECIFIC DETAILS for creating "easy win" prompts:
{
  "companyName": "extracted company name",
  "industry": "hyper-specific industry niche with unique angle",
  "description": "detailed 4-5 sentence description of exactly what they do, their proprietary approach, specific problems they solve, and what makes them uniquely positioned",
  "targetCustomers": "ultra-specific customer segments with exact company types, sizes, roles, industries, and contexts - like 'Series A fintech startups in Southeast Asia' or 'Fortune 500 automotive Tier 1 suppliers'", 
  "keyDifferentiators": "rare competitive advantages, proprietary methodologies with names, specific awards/certifications, notable client names, exact years of niche experience, unique capability combinations",
  "geographicFocus": "hyper-specific geographic markets with business context",
  "specificServices": ["ultra-detailed service with unique qualifiers", "proprietary service name/approach", "service + technology + market combination"],
  "industryNiches": ["extremely specific niche with customer context", "rare specialization few others have"],
  "technologies": ["specific technology + exact use case", "proprietary methodology + application"],
  "companySizes": ["specific size + industry context", "detailed segment + use case"],
  "locations": ["specific location + business context", "niche market + geography"],
  "uniqueCombinations": ["rare service+market+tech combination 1", "unique positioning few competitors have"]
}`;

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
          content: 'You are an expert at analyzing websites and extracting structured company information. Return only valid JSON with the requested fields.'
        },
        { role: 'user', content: extractionPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Field extraction failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and provide defaults
    const fields: ExtractedFields = {
      companyName: parsed.companyName || 'Company Name',
      industry: parsed.industry || 'Technology',
      description: parsed.description || 'Description of what the company does',
      targetCustomers: parsed.targetCustomers || 'Small to medium businesses',
      keyDifferentiators: parsed.keyDifferentiators || 'Unique value proposition',
      geographicFocus: parsed.geographicFocus || 'North America',
      specificServices: Array.isArray(parsed.specificServices) ? parsed.specificServices : [],
      industryNiches: Array.isArray(parsed.industryNiches) ? parsed.industryNiches : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      companySizes: Array.isArray(parsed.companySizes) ? parsed.companySizes : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      uniqueCombinations: Array.isArray(parsed.uniqueCombinations) ? parsed.uniqueCombinations : []
    };
    
    return fields;
    
  } catch (parseError) {
    console.error('Failed to parse field extraction response:', responseText);
    throw new Error(`Invalid extraction response: ${parseError.message}`);
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
    console.log('analyze-website-for-fields request:', { url: body.url });
    
    if (!body.url) {
      throw new Error('Website URL is required');
    }
    
    // Fetch and analyze website
    console.log('Fetching website content...');
    const websiteContent = await fetchWebsiteContent(body.url);
    
    console.log('Extracting structured fields...');
    const fields = await extractFieldsFromWebsite(websiteContent, body.url);
    
    console.log('analyze-website-for-fields completed successfully');
    return new Response(JSON.stringify({ fields }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('analyze-website-for-fields error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      fields: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});