// Supabase Edge Function: generate-smart-fixes
// Deploy: supabase functions deploy generate-smart-fixes --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface SmartFixRequest {
  failureReason: string;
  prompt: string;
  companyName: string;
  industry: string;
  cms: string;
  fixType: 'faq' | 'content' | 'schema' | 'authority';
}

interface SmartFix {
  title: string;
  description: string;
  code?: string;
  content?: string;
  instructions: {
    platform: string;
    steps: string[];
  };
  preview: string;
  timeToImplement: string;
  difficulty: 'easy' | 'moderate' | 'needs-dev';
}

async function generateSmartFix(request: SmartFixRequest): Promise<SmartFix> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const fixGenerationPrompt = `Generate a specific, implementable fix for this AI SEO issue:

PROBLEM:
Company: ${request.companyName} (${request.industry})
Failed Prompt: "${request.prompt}"
Reason: ${request.failureReason}
CMS: ${request.cms}
Fix Type: ${request.fixType}

TASK: Create a practical, copy-paste ready solution that addresses the specific failure reason.

REQUIREMENTS:
1. Generate actual code/content that can be copied and pasted
2. Make it specific to their company and industry
3. Provide step-by-step implementation instructions for their CMS
4. Include a preview of what users will see

FIX TYPE GUIDELINES:

FAQ Fix:
- Generate 3-5 relevant FAQ questions that would help with this prompt
- Include JSON-LD schema markup
- Write actual Q&A content addressing the query

Content Fix:
- Write specific content that addresses the failed prompt
- Make it comprehensive but focused
- Include relevant keywords naturally

Schema Fix:
- Generate proper JSON-LD structured data
- Use appropriate schema.org types
- Make it specific to their business

Authority Fix:
- Suggest specific ways to build authority
- Provide email templates for outreach
- Identify specific opportunities

Return JSON with this exact structure:
{
  "title": "Add FAQ Section About [Specific Topic]",
  "description": "Creates an FAQ section that directly answers queries like '[prompt]' to help AI models find and cite your expertise",
  "code": "<!-- Generated HTML/JSON-LD code here -->",
  "content": "Generated written content here",
  "instructions": {
    "platform": "${request.cms}",
    "steps": [
      "Step 1: Specific action for their CMS",
      "Step 2: Where to paste the code",
      "Step 3: How to publish changes"
    ]
  },
  "preview": "Here's how this will look to visitors: [description]",
  "timeToImplement": "15 minutes",
  "difficulty": "easy"
}

Make it actionable, specific, and ready to implement.`;

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
          content: 'You are an expert web developer and SEO specialist who creates practical, implementable solutions for AI SEO issues. Generate actual code and content that users can copy and paste to fix their problems.'
        },
        { role: 'user', content: fixGenerationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', { status: response.status, body: errorText });
    throw new Error(`Smart fix generation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content ?? '{}';
  
  try {
    const parsed = JSON.parse(responseText);
    
    // Validate and structure the fix
    const smartFix: SmartFix = {
      title: parsed.title || 'Website Improvement',
      description: parsed.description || 'Improve your website content to better address user queries',
      code: parsed.code || undefined,
      content: parsed.content || undefined,
      instructions: {
        platform: parsed.instructions?.platform || request.cms,
        steps: Array.isArray(parsed.instructions?.steps) 
          ? parsed.instructions.steps 
          : ['Contact your developer to implement this fix']
      },
      preview: parsed.preview || 'This fix will help your website better address user queries',
      timeToImplement: parsed.timeToImplement || '30 minutes',
      difficulty: ['easy', 'moderate', 'needs-dev'].includes(parsed.difficulty) 
        ? parsed.difficulty : 'moderate'
    };

    return smartFix;
    
  } catch (parseError) {
    console.error('Failed to parse smart fix response:', responseText);
    throw new Error(`Invalid fix response: ${parseError.message}`);
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
    console.log('generate-smart-fixes request:', { 
      prompt: body.prompt?.substring(0, 50) + '...',
      company: body.companyName,
      fixType: body.fixType,
      cms: body.cms
    });
    
    if (!body.failureReason || !body.prompt || !body.companyName) {
      throw new Error('Missing required fields: failureReason, prompt, companyName');
    }
    
    const smartFix = await generateSmartFix(body);
    
    console.log('generate-smart-fixes completed successfully');
    return new Response(JSON.stringify({ smartFix }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('generate-smart-fixes error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      smartFix: null
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});