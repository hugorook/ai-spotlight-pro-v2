// Supabase Edge Function: industry-benchmarking
// Deploy: supabase functions deploy industry-benchmarking --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface BenchmarkingRequest {
  industry: string;
  companyName: string;
  currentMentionRate: number;
  currentAvgPosition: number;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  region?: string;
}

interface CompetitorProfile {
  name: string;
  estimatedMentionRate: number;
  avgPosition: number;
  strengths: string[];
  weaknesses: string[];
  keyDifferentiators: string[];
}

interface IndustryBenchmark {
  industry: string;
  averageMentionRate: number;
  topPercentileMentionRate: number; // 90th percentile
  medianPosition: number;
  commonStrengths: string[];
  commonWeaknesses: string[];
  industrySpecificOpportunities: string[];
  competitiveLandscape: {
    leaders: CompetitorProfile[];
    emerging: CompetitorProfile[];
    challenges: string[];
  };
  performanceAnalysis: {
    relativePosition: 'leader' | 'above average' | 'average' | 'below average' | 'needs improvement';
    percentileRank: number; // 0-100
    gapToLeaders: number;
    gapToAverage: number;
    improvementPotential: number;
  };
  actionableInsights: {
    priority: 'high' | 'medium' | 'low';
    insight: string;
    rationale: string;
    expectedImpact: string;
  }[];
  benchmarkingRecommendations: string[];
}

async function generateIndustryBenchmark(request: BenchmarkingRequest): Promise<IndustryBenchmark> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const benchmarkingPrompt = `You are an expert in competitive intelligence and industry benchmarking for AI visibility. Provide comprehensive industry benchmarking analysis for this company.

COMPANY DETAILS:
Company: ${request.companyName}
Industry: ${request.industry}
Current Mention Rate: ${request.currentMentionRate}%
Current Avg Position: ${request.currentAvgPosition}
Company Size: ${request.companySize || 'Not specified'}
Region: ${request.region || 'Global'}

ANALYSIS REQUIREMENTS:

1. INDUSTRY BENCHMARKS
- Provide realistic industry-specific benchmarks for AI mention rates
- Consider company size, industry maturity, and competition levels
- Include percentile distributions (median, 75th percentile, 90th percentile)

2. COMPETITIVE LANDSCAPE ANALYSIS
- Identify 3-5 likely industry leaders in AI visibility
- Include 2-3 emerging competitors
- Provide realistic mention rate and position estimates
- Identify key differentiators for each competitor

3. PERFORMANCE ANALYSIS
- Classify company's relative position (leader/above average/average/below average/needs improvement)
- Calculate percentile rank based on current performance
- Identify gaps to industry leaders and average
- Estimate improvement potential

4. ACTIONABLE INSIGHTS
- High-priority insights that could significantly improve ranking
- Medium/low priority optimizations
- Industry-specific opportunities
- Competitive advantages to leverage

IMPORTANT: 
- Be realistic about benchmarks - consider actual industry competition
- Base competitor estimates on logical market analysis
- Focus on actionable insights specific to this industry
- Consider the relationship between company size and AI visibility expectations

Return JSON with this exact structure:
{
  "industry": "${request.industry}",
  "averageMentionRate": 35,
  "topPercentileMentionRate": 65,
  "medianPosition": 4,
  "commonStrengths": [
    "Industry-specific strength 1",
    "Common advantage 2"
  ],
  "commonWeaknesses": [
    "Typical challenge 1",
    "Industry limitation 2"
  ],
  "industrySpecificOpportunities": [
    "Opportunity specific to this industry",
    "Market gap that could be exploited"
  ],
  "competitiveLandscape": {
    "leaders": [
      {
        "name": "Market Leader Company",
        "estimatedMentionRate": 75,
        "avgPosition": 2,
        "strengths": ["Authority", "Content depth"],
        "weaknesses": ["Limited innovation"],
        "keyDifferentiators": ["Market presence", "Thought leadership"]
      }
    ],
    "emerging": [
      {
        "name": "Rising Competitor",
        "estimatedMentionRate": 45,
        "avgPosition": 3,
        "strengths": ["Innovation", "Agility"],
        "weaknesses": ["Limited authority"],
        "keyDifferentiators": ["Unique approach", "Niche expertise"]
      }
    ],
    "challenges": [
      "High competition for AI attention",
      "Established players dominate results"
    ]
  },
  "performanceAnalysis": {
    "relativePosition": "above average",
    "percentileRank": 65,
    "gapToLeaders": 25,
    "gapToAverage": 10,
    "improvementPotential": 30
  },
  "actionableInsights": [
    {
      "priority": "high",
      "insight": "Specific actionable insight",
      "rationale": "Why this matters for your industry",
      "expectedImpact": "Potential improvement estimate"
    }
  ],
  "benchmarkingRecommendations": [
    "Study competitor X's content strategy",
    "Focus on industry-specific authority building",
    "Target underserved query types in your sector"
  ]
}

Make insights specific and actionable for this industry and company size.`;

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
          content: 'You are an expert competitive intelligence analyst specializing in AI visibility benchmarking. You provide realistic, data-driven competitive analysis and actionable recommendations based on industry dynamics and market positioning. Focus on practical insights that companies can implement to improve their AI visibility relative to competitors.'
        },
        { role: 'user', content: benchmarkingPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Industry benchmarking failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and structure the benchmark data
    const benchmark: IndustryBenchmark = {
      industry: parsed.industry || request.industry,
      averageMentionRate: Math.max(0, Math.min(100, parsed.averageMentionRate || 35)),
      topPercentileMentionRate: Math.max(0, Math.min(100, parsed.topPercentileMentionRate || 65)),
      medianPosition: Math.max(1, parsed.medianPosition || 4),
      commonStrengths: Array.isArray(parsed.commonStrengths) ? parsed.commonStrengths : [],
      commonWeaknesses: Array.isArray(parsed.commonWeaknesses) ? parsed.commonWeaknesses : [],
      industrySpecificOpportunities: Array.isArray(parsed.industrySpecificOpportunities) ? parsed.industrySpecificOpportunities : [],
      competitiveLandscape: {
        leaders: Array.isArray(parsed.competitiveLandscape?.leaders) 
          ? parsed.competitiveLandscape.leaders.map((leader: any) => ({
              name: leader.name || 'Industry Leader',
              estimatedMentionRate: Math.max(0, Math.min(100, leader.estimatedMentionRate || 60)),
              avgPosition: Math.max(1, leader.avgPosition || 2),
              strengths: Array.isArray(leader.strengths) ? leader.strengths : ['Market leadership'],
              weaknesses: Array.isArray(leader.weaknesses) ? leader.weaknesses : ['High competition'],
              keyDifferentiators: Array.isArray(leader.keyDifferentiators) ? leader.keyDifferentiators : ['Established presence']
            })) : [],
        emerging: Array.isArray(parsed.competitiveLandscape?.emerging)
          ? parsed.competitiveLandscape.emerging.map((competitor: any) => ({
              name: competitor.name || 'Emerging Competitor',
              estimatedMentionRate: Math.max(0, Math.min(100, competitor.estimatedMentionRate || 40)),
              avgPosition: Math.max(1, competitor.avgPosition || 3),
              strengths: Array.isArray(competitor.strengths) ? competitor.strengths : ['Innovation'],
              weaknesses: Array.isArray(competitor.weaknesses) ? competitor.weaknesses : ['Limited authority'],
              keyDifferentiators: Array.isArray(competitor.keyDifferentiators) ? competitor.keyDifferentiators : ['Unique approach']
            })) : [],
        challenges: Array.isArray(parsed.competitiveLandscape?.challenges) ? parsed.competitiveLandscape.challenges : []
      },
      performanceAnalysis: {
        relativePosition: ['leader', 'above average', 'average', 'below average', 'needs improvement'].includes(parsed.performanceAnalysis?.relativePosition)
          ? parsed.performanceAnalysis.relativePosition : 'average',
        percentileRank: Math.max(0, Math.min(100, parsed.performanceAnalysis?.percentileRank || 50)),
        gapToLeaders: Math.max(0, parsed.performanceAnalysis?.gapToLeaders || 20),
        gapToAverage: parsed.performanceAnalysis?.gapToAverage || 0,
        improvementPotential: Math.max(0, Math.min(100, parsed.performanceAnalysis?.improvementPotential || 25))
      },
      actionableInsights: Array.isArray(parsed.actionableInsights)
        ? parsed.actionableInsights.map((insight: any) => ({
            priority: ['high', 'medium', 'low'].includes(insight.priority) ? insight.priority : 'medium',
            insight: insight.insight || 'Continue optimization efforts',
            rationale: insight.rationale || 'Based on industry analysis',
            expectedImpact: insight.expectedImpact || 'Moderate improvement expected'
          })) : [],
      benchmarkingRecommendations: Array.isArray(parsed.benchmarkingRecommendations) 
        ? parsed.benchmarkingRecommendations : [
          'Study top competitors in your industry',
          'Focus on industry-specific content optimization',
          'Build authority through relevant channels'
        ]
    };

    return benchmark;
    
  } catch (parseError) {
    console.error('Failed to parse benchmarking response:', responseText);
    throw new Error(`Invalid benchmarking response: ${parseError.message}`);
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
    console.log('industry-benchmarking request:', { 
      company: body.companyName,
      industry: body.industry,
      currentMentionRate: body.currentMentionRate,
      currentAvgPosition: body.currentAvgPosition
    });
    
    if (!body.industry || !body.companyName || typeof body.currentMentionRate !== 'number') {
      throw new Error('Missing required fields: industry, companyName, currentMentionRate');
    }
    
    const benchmark = await generateIndustryBenchmark(body);
    
    console.log('industry-benchmarking completed successfully');
    return new Response(JSON.stringify({ benchmark }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('industry-benchmarking error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      benchmark: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});