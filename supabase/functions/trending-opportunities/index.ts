// Supabase Edge Function: trending-opportunities
// Deploy: supabase functions deploy trending-opportunities --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

async function getTrendingOpportunities(request: TrendingRequest): Promise<TrendingOpportunity[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const trendingPrompt = `You are a trend analyst specializing in AI search and content opportunities. Analyze trending topics and emerging queries for this company:

Company: ${request.companyName}
Industry: ${request.industry}
Services: ${JSON.stringify(request.services)}
Current Keywords: ${JSON.stringify(request.keywords)}

TASK: Identify 3-4 trending opportunities where this company should create content NOW to get ahead of competitors. Focus on:

1. Emerging search patterns in their industry
2. New questions people are asking AI assistants about their services
3. Seasonal/timely opportunities in the next 2-8 weeks
4. Adjacent markets they could easily expand into

For each opportunity, consider:
- What specific queries are trending up
- Why this trend is happening (news, seasonal, technological shifts)
- What content would help them rank for these queries
- How quickly they need to act

EXAMPLES of good trending opportunities:
- "AI-powered supply chain optimization" (if it's growing due to efficiency focus)
- "Sustainable packaging solutions" (if ESG requirements are increasing)
- "Remote work productivity tools" (if new regulations are coming)

Return JSON with exactly this structure:
{
  "opportunities": [
    {
      "query": "specific search query trending up",
      "trendScore": 85,
      "timeWindow": "Next 3-4 weeks for early mover advantage", 
      "reasoning": "Why this is trending (news, seasonal, tech shifts)",
      "suggestedContent": "Specific content piece to create (FAQ, blog post, case study)",
      "difficulty": "easy"
    }
  ]
}

Focus on realistic, actionable opportunities where they can create content quickly and rank before competitors notice the trend.`;

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
          content: 'You are an expert trend analyst who identifies emerging content opportunities before competitors. Focus on realistic, actionable trends with specific timelines.'
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
      companyName: body.companyName 
    });
    
    if (!body.industry || !body.companyName) {
      throw new Error('Missing required fields: industry and companyName');
    }
    
    const opportunities = await getTrendingOpportunities(body);
    
    console.log('trending-opportunities completed successfully');
    return new Response(JSON.stringify({ opportunities }), { 
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