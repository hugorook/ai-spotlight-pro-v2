// Supabase Edge Function: get-recommendations
// Deploy: supabase functions deploy get-recommendations --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface RecommendationsRequest {
  projectId: string;
  limit?: number;
}

// Default recommendations to ensure we always have exactly 3
const defaultRecommendations = [
  {
    id: 'default-1',
    title: 'Create location-specific content',
    rationale: 'Target local search queries to improve geographic visibility',
    impact: 'High' as const,
    effort: 'Medium' as const,
    actionType: 'content-creation',
    suggestedOwner: 'Content' as const,
    links: ['https://docs.google.com/document/create'],
    status: 'todo'
  },
  {
    id: 'default-2', 
    title: 'Engage in industry forums',
    rationale: 'Build authority and discover mention opportunities',
    impact: 'Medium' as const,
    effort: 'Low' as const,
    actionType: 'community-engagement',
    suggestedOwner: 'PR' as const,
    links: ['https://reddit.com/r/entrepreneur'],
    status: 'todo'
  },
  {
    id: 'default-3',
    title: 'Monitor competitor mentions',
    rationale: 'Track where competitors appear to find new opportunities',
    impact: 'Medium' as const,
    effort: 'Low' as const,
    actionType: 'competitive-analysis',
    suggestedOwner: 'Content' as const,
    links: [],
    status: 'todo'
  }
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    console.log('get-recommendations request:', { projectId: body.projectId, limit: body.limit });

    if (!body.projectId) {
      throw new Error('Project ID is required');
    }

    const limit = body.limit || 3;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get existing recommendations, prioritizing High impact
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('project_id', body.projectId)
      .eq('status', 'todo')
      .order('impact', { ascending: false }) // High, Medium, Low
      .order('effort', { ascending: true })  // Low effort first within same impact
      .limit(limit);

    if (error) {
      throw error;
    }

    // Ensure exactly requested number of recommendations (pad with defaults if needed)
    let finalRecommendations = recommendations || [];
    
    // If we have fewer than requested, add defaults
    const needed = limit - finalRecommendations.length;
    if (needed > 0) {
      const defaults = defaultRecommendations.slice(0, needed);
      finalRecommendations = [...finalRecommendations, ...defaults];
    }

    // Ensure exactly the requested number
    finalRecommendations = finalRecommendations.slice(0, limit);

    console.log('get-recommendations completed successfully');
    return new Response(JSON.stringify({ 
      recommendations: finalRecommendations
    }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('get-recommendations error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      recommendations: defaultRecommendations.slice(0, 3)
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});