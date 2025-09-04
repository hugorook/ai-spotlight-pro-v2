// Supabase Edge Function: get-changelog
// Deploy: supabase functions deploy get-changelog --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface ChangelogRequest {
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
    console.log('get-changelog request:', { projectId: body.projectId, limit: body.limit });

    if (!body.projectId) {
      throw new Error('Project ID is required');
    }

    const limit = body.limit || 10;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recent changes/updates from the changelog table
    const { data: changelog, error } = await supabase
      .from('changelog')
      .select('*')
      .eq('project_id', body.projectId)
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    console.log('get-changelog completed successfully');
    return new Response(JSON.stringify({ 
      changelog: changelog || []
    }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('get-changelog error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      changelog: []
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});