// Supabase Edge Function: preview-ai-response
// Deploy: supabase functions deploy preview-ai-response --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface PreviewRequest {
  prompt: string;
  companyName: string;
  currentContent: string;
  proposedContent: string;
  fixType: 'faq' | 'content' | 'schema' | 'authority';
}

interface AIResponsePreview {
  current: {
    response: string;
    mentioned: boolean;
    position: number;
    reasoning: string;
  };
  afterFix: {
    response: string;
    mentioned: boolean;
    position: number;
    reasoning: string;
  };
  improvement: {
    likelihood: number; // 0-100% chance of improvement
    expectedImpact: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

async function simulateAIResponse(request: PreviewRequest): Promise<AIResponsePreview> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const simulationPrompt = `You are simulating how AI assistants (ChatGPT, Claude, etc.) would respond to a user query both BEFORE and AFTER a website improvement.

SCENARIO:
User Query: "${request.prompt}"
Company: ${request.companyName}
Fix Type: ${request.fixType}

CURRENT WEBSITE CONTENT:
${request.currentContent}

PROPOSED IMPROVEMENT:
${request.proposedContent}

TASK: Simulate realistic AI responses for both scenarios. Be realistic about how AI models actually work:

1. AI models favor companies with:
   - Clear, structured content that directly answers queries
   - FAQ sections with relevant questions
   - Authority signals (mentions, reviews, detailed info)
   - Content that matches user intent

2. AI models are less likely to mention companies with:
   - Generic, vague content
   - No direct answers to common questions
   - Thin content that doesn't demonstrate expertise

IMPORTANT: Base your simulation on how AI models actually select and rank companies in responses. Don't be overly optimistic.

Return JSON with this exact structure:
{
  "current": {
    "response": "Realistic AI response based on current content (200-300 words)",
    "mentioned": false,
    "position": 0,
    "reasoning": "Why the company wasn't mentioned or ranked low"
  },
  "afterFix": {
    "response": "Realistic AI response after implementing the fix (200-300 words)", 
    "mentioned": true,
    "position": 3,
    "reasoning": "Why the improvement would help the company get mentioned"
  },
  "improvement": {
    "likelihood": 75,
    "expectedImpact": "Likely to appear in similar queries about [specific topic]",
    "confidence": "high"
  }
}

Be realistic - not every fix guarantees top ranking. Consider the actual content quality and competition.`;

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
          content: 'You are an expert at predicting how AI models respond to queries and rank companies. You understand what content improvements actually lead to better AI visibility. Be realistic and accurate in your predictions.'
        },
        { role: 'user', content: simulationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`AI response simulation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and structure the response
    const preview: AIResponsePreview = {
      current: {
        response: parsed.current?.response || 'AI would not mention your company prominently.',
        mentioned: Boolean(parsed.current?.mentioned),
        position: Math.max(0, parsed.current?.position || 0),
        reasoning: parsed.current?.reasoning || 'Content does not effectively address the query'
      },
      afterFix: {
        response: parsed.afterFix?.response || 'AI would be more likely to mention your company.',
        mentioned: Boolean(parsed.afterFix?.mentioned),
        position: Math.max(0, parsed.afterFix?.position || 0),
        reasoning: parsed.afterFix?.reasoning || 'Improved content better addresses user intent'
      },
      improvement: {
        likelihood: Math.min(100, Math.max(0, parsed.improvement?.likelihood || 50)),
        expectedImpact: parsed.improvement?.expectedImpact || 'Should improve visibility for related queries',
        confidence: ['high', 'medium', 'low'].includes(parsed.improvement?.confidence) 
          ? parsed.improvement.confidence : 'medium'
      }
    };

    return preview;
    
  } catch (parseError) {
    console.error('Failed to parse AI response simulation:', responseText);
    throw new Error(`Invalid simulation response: ${parseError.message}`);
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
    console.log('preview-ai-response request:', { 
      prompt: body.prompt?.substring(0, 50) + '...',
      company: body.companyName,
      fixType: body.fixType 
    });
    
    if (!body.prompt || !body.companyName || !body.proposedContent) {
      throw new Error('Missing required fields: prompt, companyName, proposedContent');
    }
    
    const preview = await simulateAIResponse(body);
    
    console.log('preview-ai-response completed successfully');
    return new Response(JSON.stringify({ preview }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('preview-ai-response error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      preview: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});