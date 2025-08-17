// Supabase Edge Function: analyze-website
// Deploy: supabase functions deploy analyze-website --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface WebsiteAnalysisResult {
  content: string;
  analysis: {
    contentSummary: string;
    aiOptimizationOpportunities: string[];
    keyTopics: string[];
    contentGaps: string[];
    recommendations: string[];
  };
  fetchedAt: string;
  error?: string;
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    console.log('Fetching content from:', url);
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Visibility-Bot/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Basic HTML parsing to extract text content
    // Remove script and style tags
    let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract text from common content tags
    const contentRegex = /<(?:p|h[1-6]|div|span|article|section)[^>]*>(.*?)<\/(?:p|h[1-6]|div|span|article|section)>/gi;
    const matches = [...cleanHtml.matchAll(contentRegex)];
    
    let textContent = matches
      .map(match => match[1])
      .join(' ')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If content extraction didn't work well, fallback to simple approach
    if (textContent.length < 200) {
      textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Limit content length to avoid token limits
    const maxLength = 8000;
    if (textContent.length > maxLength) {
      textContent = textContent.substring(0, maxLength) + '...';
    }
    
    console.log(`Extracted ${textContent.length} characters of content`);
    return textContent;
    
  } catch (error) {
    console.error('Error fetching website content:', error);
    throw new Error(`Failed to fetch website content: ${error.message}`);
  }
}

async function analyzeWebsiteContent(content: string, companyInfo: any): Promise<WebsiteAnalysisResult['analysis']> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }
  
  const analysisPrompt = `Analyze this website content for AI optimization opportunities. Company info: ${JSON.stringify(companyInfo)}

Website Content:
${content}

Provide a JSON response with:
{
  "contentSummary": "Brief summary of what this website is about",
  "aiOptimizationOpportunities": ["List of 3-5 specific ways to optimize content for AI models"],
  "keyTopics": ["List of main topics/keywords covered"],
  "contentGaps": ["List of missing content areas that would help AI visibility"],
  "recommendations": ["List of actionable recommendations for better AI discoverability"]
}

Focus on making the content more discoverable by AI models like ChatGPT when users ask relevant questions.`;

  console.log('Analyzing website content with AI...');
  
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
          content: 'You are an expert in optimizing website content for AI model discoverability. Analyze content and provide specific, actionable recommendations.'
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`AI analysis failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  const analysisText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const analysis = JSON.parse(analysisText);
    console.log('Website analysis completed successfully');
    return analysis;
  } catch (parseError) {
    console.error('Failed to parse AI analysis:', analysisText);
    throw new Error(`Invalid AI analysis response: ${parseError.message}`);
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
    console.log('analyze-website request:', { 
      url: body.url,
      companyName: body.companyName 
    });
    
    if (!body.url) {
      throw new Error('Missing required field: url');
    }
    
    // Fetch website content
    const content = await fetchWebsiteContent(body.url);
    
    // Analyze content with AI
    const analysis = await analyzeWebsiteContent(content, {
      companyName: body.companyName,
      industry: body.industry,
      description: body.description,
    });
    
    const result: WebsiteAnalysisResult = {
      content: content,
      analysis: analysis,
      fetchedAt: new Date().toISOString(),
    };
    
    console.log('analyze-website completed successfully');
    return new Response(JSON.stringify(result), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('analyze-website error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const errorResult: WebsiteAnalysisResult = {
      content: '',
      analysis: {
        contentSummary: 'Analysis failed',
        aiOptimizationOpportunities: [],
        keyTopics: [],
        contentGaps: [],
        recommendations: [],
      },
      fetchedAt: new Date().toISOString(),
      error: errorMessage,
    };
    
    return new Response(JSON.stringify(errorResult), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});