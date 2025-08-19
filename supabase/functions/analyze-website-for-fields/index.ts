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

  const extractionPrompt = `Analyze this website content and extract structured company information.

Website URL: ${url}
Website Content: ${websiteContent}

Extract the following fields based on the website content:

1. Company Name: The actual company name (from headers, titles, etc.)
2. Industry: What industry/sector they operate in (be specific, e.g., "SaaS Analytics", "Food Delivery", "B2B Marketing")
3. Description: What the company does and their main value proposition (2-3 sentences)
4. Target Customers: Who they serve (be specific about company size, industry, roles, e.g., "SMB retailers", "Enterprise manufacturers", "Marketing teams at SaaS companies")
5. Key Differentiators: What makes them unique/better than competitors (awards, unique features, expertise)
6. Geographic Focus: Where they operate (if mentioned - could be "Global", "North America", "San Francisco Bay Area", etc.)

Return ONLY valid JSON:
{
  "companyName": "extracted company name",
  "industry": "specific industry",
  "description": "what they do and value prop",
  "targetCustomers": "specific customer segments they serve", 
  "keyDifferentiators": "what makes them unique",
  "geographicFocus": "where they operate or serve customers"
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
      geographicFocus: parsed.geographicFocus || 'North America'
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