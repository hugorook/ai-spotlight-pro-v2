// Supabase Edge Function: analyze-competitive-authority
// Deploy: supabase functions deploy analyze-competitive-authority --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface CompetitiveAnalysisRequest {
  companyName: string;
  industry: string;
  competitors?: string[];
  keyDifferentiators?: string;
}

interface AuthorityOpportunity {
  source: string;
  type: 'directory' | 'review_platform' | 'industry_publication' | 'podcast' | 'award' | 'certification';
  description: string;
  actionRequired: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  potentialImpact: 'low' | 'medium' | 'high';
  url?: string;
  contactInfo?: string;
}

interface CompetitorMention {
  competitor: string;
  source: string;
  type: string;
  reasoning: string;
  opportunityForYou: string;
}

interface CompetitiveAuthorityAnalysis {
  industryAuthorities: string[];
  keyDirectories: string[];
  reviewPlatforms: string[];
  authorityOpportunities: AuthorityOpportunity[];
  competitorMentions: CompetitorMention[];
  actionPlan: {
    immediate: AuthorityOpportunity[];
    shortTerm: AuthorityOpportunity[];
    longTerm: AuthorityOpportunity[];
  };
}

async function analyzeCompetitiveAuthority(request: CompetitiveAnalysisRequest): Promise<CompetitiveAuthorityAnalysis> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const analysisPrompt = `You are an expert in competitive authority analysis and digital reputation building. Analyze the authority landscape for this company and identify specific opportunities to build AI-relevant authority.

COMPANY DETAILS:
Company: ${request.companyName}
Industry: ${request.industry}
Key Differentiators: ${request.keyDifferentiators || 'Not specified'}
Known Competitors: ${request.competitors?.join(', ') || 'Not specified'}

TASK: Provide a comprehensive authority analysis focusing on opportunities that will improve AI visibility. AI models favor companies that are mentioned by authoritative sources, have reviews, certifications, and industry recognition.

ANALYSIS REQUIREMENTS:

1. INDUSTRY AUTHORITY SOURCES
Identify the top 5-8 most important authority sources in this industry:
- Industry publications that AI models reference
- Professional associations and certification bodies  
- Review platforms specific to this industry
- Industry directories and databases
- Award organizations and ranking sites

2. AUTHORITY OPPORTUNITIES  
For each opportunity, provide:
- Specific source name (e.g., "G2 Crowd", "Clutch.co", "Industry Week")
- Type of authority building opportunity
- Specific action required to get mentioned/listed
- Estimated effort and potential impact for AI visibility
- Contact information or submission process if available

3. COMPETITIVE MENTIONS
Analyze where competitors likely get mentioned and why:
- What sources mention companies like theirs
- What criteria these sources use for inclusion
- How this company can position themselves similarly

4. PRIORITIZED ACTION PLAN
Sort opportunities into immediate (0-30 days), short-term (1-3 months), and long-term (3+ months) based on:
- Effort required vs potential AI impact
- Likelihood of success
- Time to see results in AI responses

IMPORTANT: Focus on realistic, actionable opportunities. Avoid generic advice. Be specific about sources, submission processes, and requirements.

Return JSON with this exact structure:
{
  "industryAuthorities": [
    "Specific industry publication 1",
    "Professional association 2"
  ],
  "keyDirectories": [
    "Industry-specific directory 1",
    "Review platform 2"
  ],
  "reviewPlatforms": [
    "Platform 1 specific to industry",
    "Platform 2 for their service type"
  ],
  "authorityOpportunities": [
    {
      "source": "Specific source name",
      "type": "directory",
      "description": "What this source is and why it matters for AI visibility",
      "actionRequired": "Specific steps to get listed/mentioned",
      "estimatedEffort": "low",
      "potentialImpact": "high",
      "url": "submission URL if available",
      "contactInfo": "contact info if available"
    }
  ],
  "competitorMentions": [
    {
      "competitor": "Competitor name or 'Companies like theirs'",
      "source": "Where they get mentioned",
      "type": "Type of mention",
      "reasoning": "Why they get mentioned there", 
      "opportunityForYou": "How this company can get similar mentions"
    }
  ],
  "actionPlan": {
    "immediate": [opportunities for 0-30 days],
    "shortTerm": [opportunities for 1-3 months],
    "longTerm": [opportunities for 3+ months]
  }
}

Focus on opportunities that will actually improve AI model citations and mentions.`;

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
          content: 'You are an expert competitive analyst specializing in authority building for AI visibility. You identify specific, actionable opportunities for companies to build the kind of authority that AI models recognize and cite. Focus on realistic opportunities with clear action steps.'
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Competitive authority analysis failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and structure the analysis
    const analysis: CompetitiveAuthorityAnalysis = {
      industryAuthorities: Array.isArray(parsed.industryAuthorities) ? parsed.industryAuthorities : [],
      keyDirectories: Array.isArray(parsed.keyDirectories) ? parsed.keyDirectories : [],
      reviewPlatforms: Array.isArray(parsed.reviewPlatforms) ? parsed.reviewPlatforms : [],
      authorityOpportunities: Array.isArray(parsed.authorityOpportunities) 
        ? parsed.authorityOpportunities.map((opp: any) => ({
            source: opp.source || 'Authority Source',
            type: ['directory', 'review_platform', 'industry_publication', 'podcast', 'award', 'certification'].includes(opp.type) 
              ? opp.type : 'directory',
            description: opp.description || 'Authority building opportunity',
            actionRequired: opp.actionRequired || 'Contact source for inclusion',
            estimatedEffort: ['low', 'medium', 'high'].includes(opp.estimatedEffort) ? opp.estimatedEffort : 'medium',
            potentialImpact: ['low', 'medium', 'high'].includes(opp.potentialImpact) ? opp.potentialImpact : 'medium',
            url: opp.url || undefined,
            contactInfo: opp.contactInfo || undefined
          })) : [],
      competitorMentions: Array.isArray(parsed.competitorMentions) 
        ? parsed.competitorMentions.map((mention: any) => ({
            competitor: mention.competitor || 'Competitor',
            source: mention.source || 'Industry source',
            type: mention.type || 'Mention',
            reasoning: mention.reasoning || 'Industry recognition',
            opportunityForYou: mention.opportunityForYou || 'Similar positioning opportunity'
          })) : [],
      actionPlan: {
        immediate: Array.isArray(parsed.actionPlan?.immediate) ? parsed.actionPlan.immediate : [],
        shortTerm: Array.isArray(parsed.actionPlan?.shortTerm) ? parsed.actionPlan.shortTerm : [],
        longTerm: Array.isArray(parsed.actionPlan?.longTerm) ? parsed.actionPlan.longTerm : []
      }
    };

    return analysis;
    
  } catch (parseError) {
    console.error('Failed to parse competitive authority analysis:', responseText);
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
    console.log('analyze-competitive-authority request:', { 
      company: body.companyName,
      industry: body.industry 
    });
    
    if (!body.companyName || !body.industry) {
      throw new Error('Missing required fields: companyName and industry');
    }
    
    const analysis = await analyzeCompetitiveAuthority(body);
    
    console.log('analyze-competitive-authority completed successfully');
    return new Response(JSON.stringify({ analysis }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('analyze-competitive-authority error:', error);
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