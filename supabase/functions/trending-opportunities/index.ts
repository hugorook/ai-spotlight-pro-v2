// Supabase Edge Function: trending-opportunities
// Deploy: supabase functions deploy trending-opportunities --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SERP_API_KEY = Deno.env.get('SERP_API_KEY');

interface TrendingRequest {
  industry: string;
  companyName: string;
  services: string[];
  keywords: string[];
}

interface TrendingOpportunity {
  query: string;
  trendScore: number; // 1-100 representing growth/interest
  timeWindow: string;
  reasoning: string;
  suggestedContent: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
}

// Get real Google Trends data using SERP API
async function getGoogleTrendsData(keywords: string[]): Promise<any> {
  if (!SERP_API_KEY) {
    console.warn('SERP_API_KEY not set, skipping trends data');
    return null;
  }

  try {
    // Get trending data for the industry keywords (limit to 3 keywords to avoid long URLs)
    const searchKeywords = keywords.slice(0, 3).join(',');
    const trendsUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(searchKeywords)}&data_type=TIMESERIES&hl=en&geo=US&api_key=${SERP_API_KEY}`;
    
    console.log('Fetching Google Trends for:', searchKeywords);
    const response = await fetch(trendsUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SERP API error: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Google Trends data received');
    return data;
  } catch (error) {
    console.error('Error fetching Google Trends data:', error);
    return null;
  }
}

// Get related queries that are trending up
async function getRelatedQueries(keyword: string): Promise<any> {
  if (!SERP_API_KEY) {
    return null;
  }

  try {
    const relatedUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(keyword)}&data_type=RELATED_QUERIES&hl=en&geo=US&api_key=${SERP_API_KEY}`;
    
    console.log('Fetching related queries for:', keyword);
    const response = await fetch(relatedUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SERP API related queries error: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Related queries data received');
    return data;
  } catch (error) {
    console.error('Error fetching related queries:', error);
    return null;
  }
}

async function getTrendingOpportunities(request: TrendingRequest): Promise<TrendingOpportunity[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Prepare keywords for Google Trends analysis
  const industryKeywords = [
    request.industry,
    ...request.services.slice(0, 2), // Limit to avoid long URLs
    ...(request.keywords || []).slice(0, 2)
  ].filter(k => k && k.length > 2); // Filter out empty/short keywords

  console.log('Analyzing trends for keywords:', industryKeywords);

  // Get real Google Trends data
  const trendsData = await getGoogleTrendsData(industryKeywords);
  const relatedQueries = await getRelatedQueries(request.industry);

  // Prepare trending context for AI analysis
  let trendsContext = '';
  if (trendsData) {
    trendsContext += `\nREAL GOOGLE TRENDS DATA:\n${JSON.stringify(trendsData, null, 2)}`;
  }
  if (relatedQueries) {
    trendsContext += `\nRELATED TRENDING QUERIES:\n${JSON.stringify(relatedQueries, null, 2)}`;
  }

  const trendingPrompt = `You are a trend analyst specializing in AI search and content opportunities. Analyze REAL Google Trends data and emerging queries for this company:

Company: ${request.companyName}
Industry: ${request.industry}
Services: ${JSON.stringify(request.services)}
Current Keywords: ${JSON.stringify(request.keywords)}

${trendsContext}

TASK: Based on the REAL Google Trends data above, identify 3-4 trending opportunities where this company should create content NOW to get ahead of competitors.

IMPORTANT: Use the actual trending data provided. Look for:
1. Keywords with rising search volume (breakout trends, rising percentages)
2. Related queries that are gaining momentum in the "rising" section
3. Seasonal patterns showing upward trends
4. Adjacent terms that are connecting to their industry

For each opportunity, analyze:
- What specific queries show rising search volume in the data
- Why this trend is happening (based on the trend trajectory)
- What content would help them rank for these trending queries
- Timeline based on trend velocity

${trendsData || relatedQueries ? 'Focus on the actual trend data provided above. Extract rising queries from the "rising" sections.' : 'Note: No trends data available (likely due to SERP API key not configured). Provide general industry insights based on current market conditions and seasonal trends.'}

Return JSON with exactly this structure:
{
  "opportunities": [
    {
      "query": "specific trending query from the data or realistic industry trend",
      "trendScore": 85,
      "timeWindow": "Next 3-4 weeks based on trend velocity", 
      "reasoning": "${trendsData ? 'Based on Google Trends data showing rising interest' : 'Based on industry analysis and seasonal patterns'}",
      "suggestedContent": "Specific content piece to create (FAQ, blog post, case study)",
      "difficulty": "easy"
    }
  ]
}

Focus on realistic, actionable opportunities that this company can quickly act on.`;

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
          content: 'You are an expert trend analyst who identifies emerging content opportunities using real Google Trends data. Focus on realistic, actionable trends with specific timelines. When trends data is available, extract actual rising queries.'
        },
        { role: 'user', content: trendingPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Trending analysis failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    const opportunities: TrendingOpportunity[] = (parsed.opportunities || []).map((opp: any) => ({
      query: opp.query || 'Trending opportunity',
      trendScore: Math.min(100, Math.max(1, opp.trendScore || 70)),
      timeWindow: opp.timeWindow || 'Next 4-6 weeks',
      reasoning: opp.reasoning || 'Emerging trend in your industry',
      suggestedContent: opp.suggestedContent || 'Create content addressing this query',
      difficulty: ['easy', 'moderate', 'advanced'].includes(opp.difficulty) ? opp.difficulty : 'moderate'
    }));

    return opportunities.slice(0, 4); // Limit to 4 opportunities
    
  } catch (parseError) {
    console.error('Failed to parse trending opportunities response:', responseText);
    throw new Error(`Invalid trending response: ${parseError.message}`);
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
    console.log('trending-opportunities request:', { 
      industry: body.industry,
      companyName: body.companyName,
      hasSerp: !!SERP_API_KEY
    });
    
    if (!body.industry || !body.companyName) {
      throw new Error('Missing required fields: industry and companyName');
    }
    
    const opportunities = await getTrendingOpportunities(body);
    
    console.log('trending-opportunities completed successfully');
    return new Response(JSON.stringify({ 
      opportunities,
      note: !SERP_API_KEY ? 'SERP API key not configured - using general industry insights' : 'Using real Google Trends data'
    }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('trending-opportunities error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      opportunities: []
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});