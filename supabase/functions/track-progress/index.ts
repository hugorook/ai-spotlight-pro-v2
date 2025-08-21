// Supabase Edge Function: track-progress
// Deploy: supabase functions deploy track-progress --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ProgressTrackingRequest {
  companyName: string;
  currentResults: TestResult[];
  previousResults?: TestResult[];
  implementedFixes?: ImplementedFix[];
  timeframe?: string; // e.g., "30 days", "7 days"
}

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
  timestamp?: string;
}

interface ImplementedFix {
  fixType: 'faq' | 'content' | 'schema' | 'authority';
  description: string;
  implementedDate: string;
  targetPrompts: string[];
  platform: string;
}

interface ProgressMetrics {
  overallImprovement: {
    mentionRateChange: number; // percentage point change
    positionImprovement: number; // average position improvement
    sentimentImprovement: number; // sentiment score change
    trend: 'improving' | 'declining' | 'stable';
  };
  specificImprovements: {
    prompt: string;
    beforeMentioned: boolean;
    afterMentioned: boolean;
    positionChange: number;
    sentimentChange: string;
    likelyReason: string;
  }[];
  fixAttribution: {
    fixType: string;
    description: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    promptsImproved: string[];
    confidence: number; // 0-100
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    expectedTimeframe: string;
  }[];
  nextSteps: string[];
}

async function trackProgress(request: ProgressTrackingRequest): Promise<ProgressMetrics> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const progressAnalysisPrompt = `You are an expert in AI SEO progress tracking and improvement attribution. Analyze the progress of this company's AI visibility improvements.

COMPANY: ${request.companyName}
TIMEFRAME: ${request.timeframe || 'Recent comparison'}

CURRENT TEST RESULTS:
${request.currentResults.map(r => `- "${r.prompt}": ${r.mentioned ? `Mentioned at position ${r.position}` : 'Not mentioned'} (${r.sentiment})`).join('\n')}

PREVIOUS TEST RESULTS (for comparison):
${request.previousResults ? 
  request.previousResults.map(r => `- "${r.prompt}": ${r.mentioned ? `Mentioned at position ${r.position}` : 'Not mentioned'} (${r.sentiment})`).join('\n') :
  'No previous results provided - focus on current performance analysis'
}

IMPLEMENTED FIXES:
${request.implementedFixes ? 
  request.implementedFixes.map(f => `- ${f.fixType.toUpperCase()}: ${f.description} (${f.implementedDate}) - Targeting: ${f.targetPrompts.join(', ')}`).join('\n') :
  'No fixes tracked'
}

ANALYSIS REQUIREMENTS:

1. PROGRESS CALCULATION
- Calculate mention rate changes (percentage points)
- Track average position improvements 
- Measure sentiment improvements
- Determine overall trend direction

2. SPECIFIC IMPROVEMENTS
For each prompt that improved:
- Before vs after status
- Position changes
- Sentiment changes
- Most likely reason for improvement

3. FIX ATTRIBUTION
For each implemented fix:
- Estimate its impact on specific prompts
- Assign confidence level (0-100)
- Identify which improvements it likely caused

4. STRATEGIC RECOMMENDATIONS
- High-priority actions based on current performance gaps
- Medium/low priority optimizations
- Expected timeframes for each recommendation

5. NEXT STEPS
- Immediate actions (0-7 days)
- Short-term actions (1-4 weeks)
- Long-term strategy (1-3 months)

IMPORTANT: Be realistic about attributing improvements to fixes. Only attribute with high confidence when there's clear correlation. Consider external factors and natural fluctuations.

Return JSON with this exact structure:
{
  "overallImprovement": {
    "mentionRateChange": 15.5,
    "positionImprovement": 2.3,
    "sentimentImprovement": 0.2,
    "trend": "improving"
  },
  "specificImprovements": [
    {
      "prompt": "Specific prompt text",
      "beforeMentioned": false,
      "afterMentioned": true,
      "positionChange": 3,
      "sentimentChange": "neutral to positive",
      "likelyReason": "FAQ section addition targeting this query"
    }
  ],
  "fixAttribution": [
    {
      "fixType": "FAQ Addition",
      "description": "Added comprehensive FAQ section",
      "estimatedImpact": "high",
      "promptsImproved": ["prompt 1", "prompt 2"],
      "confidence": 85
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Specific action to take",
      "reasoning": "Why this will help",
      "expectedTimeframe": "2-4 weeks"
    }
  ],
  "nextSteps": [
    "Immediate action 1",
    "Short-term action 2",
    "Long-term strategy 3"
  ]
}

Focus on actionable insights and realistic attribution.`;

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
          content: 'You are an expert in AI SEO progress analysis and improvement attribution. You track how specific changes impact AI visibility and provide actionable insights for continued improvement. Be realistic about cause-and-effect relationships and focus on data-driven recommendations.'
        },
        { role: 'user', content: progressAnalysisPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Progress tracking failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and structure the progress metrics
    const progressMetrics: ProgressMetrics = {
      overallImprovement: {
        mentionRateChange: parsed.overallImprovement?.mentionRateChange || 0,
        positionImprovement: parsed.overallImprovement?.positionImprovement || 0,
        sentimentImprovement: parsed.overallImprovement?.sentimentImprovement || 0,
        trend: ['improving', 'declining', 'stable'].includes(parsed.overallImprovement?.trend) 
          ? parsed.overallImprovement.trend : 'stable'
      },
      specificImprovements: Array.isArray(parsed.specificImprovements) 
        ? parsed.specificImprovements.map((imp: any) => ({
            prompt: imp.prompt || 'Query',
            beforeMentioned: Boolean(imp.beforeMentioned),
            afterMentioned: Boolean(imp.afterMentioned),
            positionChange: imp.positionChange || 0,
            sentimentChange: imp.sentimentChange || 'no change',
            likelyReason: imp.likelyReason || 'Natural variation'
          })) : [],
      fixAttribution: Array.isArray(parsed.fixAttribution) 
        ? parsed.fixAttribution.map((fix: any) => ({
            fixType: fix.fixType || 'Unknown fix',
            description: fix.description || 'Improvement made',
            estimatedImpact: ['high', 'medium', 'low'].includes(fix.estimatedImpact) 
              ? fix.estimatedImpact : 'medium',
            promptsImproved: Array.isArray(fix.promptsImproved) ? fix.promptsImproved : [],
            confidence: Math.min(100, Math.max(0, fix.confidence || 50))
          })) : [],
      recommendations: Array.isArray(parsed.recommendations) 
        ? parsed.recommendations.map((rec: any) => ({
            priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
            action: rec.action || 'Continue optimization efforts',
            reasoning: rec.reasoning || 'Based on current performance',
            expectedTimeframe: rec.expectedTimeframe || '2-4 weeks'
          })) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [
        'Continue monitoring AI visibility',
        'Implement high-priority recommendations',
        'Track progress over time'
      ]
    };

    return progressMetrics;
    
  } catch (parseError) {
    console.error('Failed to parse progress tracking response:', responseText);
    throw new Error(`Invalid progress response: ${parseError.message}`);
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
    console.log('track-progress request:', { 
      company: body.companyName,
      currentResults: body.currentResults?.length || 0,
      previousResults: body.previousResults?.length || 0,
      implementedFixes: body.implementedFixes?.length || 0
    });
    
    if (!body.companyName || !Array.isArray(body.currentResults)) {
      throw new Error('Missing required fields: companyName and currentResults');
    }
    
    const progressMetrics = await trackProgress(body);
    
    console.log('track-progress completed successfully');
    return new Response(JSON.stringify({ progressMetrics }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('track-progress error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      progressMetrics: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});