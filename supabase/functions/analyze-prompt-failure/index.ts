// Supabase Edge Function: analyze-prompt-failure
// Deploy: supabase functions deploy analyze-prompt-failure --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface FailureAnalysisRequest {
  prompt: string;
  companyName: string;
  companyWebsite: string;
  mentioned: boolean;
  position: number;
  aiResponse?: string;
}

interface FailureAnalysis {
  primaryReason: string;
  category: 'content' | 'authority' | 'technical' | 'competition';
  severity: 'critical' | 'moderate' | 'minor';
  quickFix: string;
  detailedFix: string;
  timeToFix: string;
  difficulty: 'easy' | 'moderate' | 'needs-dev';
  expectedImpact: string;
  competitorInsight?: string;
}

async function analyzePromptFailure(request: FailureAnalysisRequest): Promise<FailureAnalysis> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const analysisPrompt = `You are an AI SEO expert analyzing why a company failed to appear in AI search results for a specific prompt.

PROMPT THAT FAILED: "${request.prompt}"
COMPANY: ${request.companyName}
WEBSITE: ${request.companyWebsite}
RESULT: ${request.mentioned ? `Mentioned at position ${request.position}` : 'Not mentioned at all'}
${request.aiResponse ? `AI RESPONSE: ${request.aiResponse}` : ''}

TASK: Analyze exactly WHY this company didn't rank well for this prompt and provide specific, actionable fixes.

Consider these failure categories:
1. CONTENT: Missing content, thin content, doesn't answer the query well
2. AUTHORITY: Lacks credibility signals, no mentions by others, no reviews/testimonials  
3. TECHNICAL: Missing schema markup, poor site structure, mobile issues
4. COMPETITION: Others simply have better content/authority for this query

For each failed prompt, provide:
- The PRIMARY reason they didn't rank (be specific)
- Quick fix they can implement immediately
- Detailed fix for maximum impact
- Realistic time estimate and difficulty
- Expected improvement

EXAMPLES of good analysis:
❌ Generic: "Need better content"
✅ Specific: "Missing FAQ section that directly answers this query - competitors have dedicated FAQ blocks"

❌ Vague: "Improve SEO"  
✅ Actionable: "Add JSON-LD schema for FAQ - takes 15 minutes, likely improves ranking for question-based prompts"

Return JSON with exactly this structure:
{
  "primaryReason": "Specific reason they didn't rank (what's missing vs competitors)",
  "category": "content",
  "severity": "critical", 
  "quickFix": "Immediate 15-30 minute fix they can do right now",
  "detailedFix": "More comprehensive fix for maximum impact",
  "timeToFix": "15 minutes",
  "difficulty": "easy",
  "expectedImpact": "Likely to rank for this prompt type within 2-4 weeks",
  "competitorInsight": "What competitors are doing that this company isn't"
}

Be specific, actionable, and realistic with timeframes and impact estimates.`;

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
          content: 'You are an expert AI SEO analyst who provides specific, actionable reasons why companies fail to rank in AI search results. Focus on concrete, implementable fixes with realistic timeframes.'
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Failure analysis failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    const analysis: FailureAnalysis = {
      primaryReason: parsed.primaryReason || 'Content does not effectively address this query',
      category: ['content', 'authority', 'technical', 'competition'].includes(parsed.category) 
        ? parsed.category : 'content',
      severity: ['critical', 'moderate', 'minor'].includes(parsed.severity) 
        ? parsed.severity : 'moderate',
      quickFix: parsed.quickFix || 'Add relevant content section addressing this query',
      detailedFix: parsed.detailedFix || 'Create comprehensive content that thoroughly addresses the query',
      timeToFix: parsed.timeToFix || '30 minutes',
      difficulty: ['easy', 'moderate', 'needs-dev'].includes(parsed.difficulty) 
        ? parsed.difficulty : 'moderate',
      expectedImpact: parsed.expectedImpact || 'Should improve ranking for similar queries',
      competitorInsight: parsed.competitorInsight || undefined
    };

    return analysis;
    
  } catch (parseError) {
    console.error('Failed to parse failure analysis response:', responseText);
    throw new Error(`Invalid analysis response: ${parseError.message}`);
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
    console.log('analyze-prompt-failure request:', { 
      prompt: body.prompt?.substring(0, 50) + '...',
      company: body.companyName 
    });
    
    if (!body.prompt || !body.companyName) {
      throw new Error('Missing required fields: prompt and companyName');
    }
    
    const analysis = await analyzePromptFailure(body);
    
    console.log('analyze-prompt-failure completed successfully');
    return new Response(JSON.stringify({ analysis }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('analyze-prompt-failure error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      analysis: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});