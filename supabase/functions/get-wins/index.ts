// Supabase Edge Function: get-wins
// Deploy: supabase functions deploy get-wins --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface WinsRequest {
  projectId: string;
  limit?: number;
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
    console.log('get-wins request:', { projectId: body.projectId, limit: body.limit });

    if (!body.projectId) {
      throw new Error('Project ID is required');
    }

    const limit = body.limit || 8;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recent wins (last 7 days, fallback to 14 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    let { data: wins, error } = await supabase
      .from('prompt_results')
      .select('*')
      .eq('project_id', body.projectId)
      .eq('appears', true)
      .gte('last_seen', sevenDaysAgo)
      .order('rank', { ascending: true })
      .limit(limit);

    // Fallback to 14 days if no recent wins
    if (!wins || wins.length === 0) {
      const { data: olderWins } = await supabase
        .from('prompt_results')
        .select('*')
        .eq('project_id', body.projectId)
        .eq('appears', true)
        .gte('last_seen', fourteenDaysAgo)
        .order('rank', { ascending: true })
        .limit(limit);
      
      wins = olderWins || [];
    }

    if (error) {
      throw error;
    }

    console.log('get-wins completed successfully');
    return new Response(JSON.stringify({ 
      wins: wins || [],
      totalCount: wins?.length || 0
    }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('get-wins error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      wins: [],
      totalCount: 0
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});