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

5. Key Differentiators: List specific competitive advantages:
   - Unique methodologies or frameworks
   - Proprietary technology or IP
   - Industry awards or certifications
   - Years of experience in specific niches
   - Notable clients or case studies
   - Specific expertise areas

6. Geographic Focus: Specific locations where they operate or serve clients

7. Specific Services: Detailed array of exact services (not generic categories):
   - Example: ["algorithmic commodity trading", "sugar futures hedging", "agricultural supply chain financing"] NOT ["commodity trading"]

8. Industry Niches: Very specific sub-industries or specializations:
   - Example: ["pharmaceutical temperature-controlled logistics", "automotive just-in-time supply chain", "luxury goods authentication"] NOT ["logistics"]

9. Technologies: Specific technologies, methodologies, or approaches:
   - Example: ["machine learning price prediction", "blockchain supply chain tracking", "IoT temperature monitoring"] NOT ["technology solutions"]

10. Company Sizes: Specific company size segments they serve:
    - Example: ["Series A-B startups (10-50 employees)", "mid-market companies ($50-500M revenue)", "Fortune 1000 enterprises"]

11. Locations: Specific geographic markets, cities, regions:
    - Example: ["London financial district", "New York tri-state area", "California Central Valley", "Southeast Asia emerging markets"]

Return ONLY valid JSON with MAXIMUM DETAIL:
{
  "companyName": "extracted company name",
  "industry": "highly specific industry niche",
  "description": "detailed 4-5 sentence description of exactly what they do, how they do it, what problems they solve, and what makes them unique",
  "targetCustomers": "very specific customer segments with company types, sizes, roles, and industries - include examples like 'Series A SaaS companies' or 'Fortune 500 manufacturers'", 
  "keyDifferentiators": "specific competitive advantages, unique methodologies, awards, certifications, notable clients, years of experience in niches",
  "geographicFocus": "specific geographic markets where they operate",
  "specificServices": ["highly detailed service 1", "specific service 2", "exact offering 3"],
  "industryNiches": ["very specific niche 1", "detailed specialization 2"],
  "technologies": ["specific technology/methodology 1", "exact approach 2"],
  "companySizes": ["specific size range 1", "detailed segment 2"],
  "locations": ["specific location 1", "detailed market 2"]
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
      locations: Array.isArray(parsed.locations) ? parsed.locations : []
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