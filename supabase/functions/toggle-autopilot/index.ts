// Supabase Edge Function: toggle-autopilot
// Deploy: supabase functions deploy toggle-autopilot --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface ToggleAutopilotRequest {
  projectId: string;
  enabled: boolean;
  scopes?: string[];
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
    console.log('toggle-autopilot request:', { 
      projectId: body.projectId, 
      enabled: body.enabled, 
      scopes: body.scopes 
    });

    if (!body.projectId) {
      throw new Error('Project ID is required');
    }

    if (typeof body.enabled !== 'boolean') {
      throw new Error('Enabled flag is required and must be a boolean');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project exists
    const { data: existingProject, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', body.projectId)
      .single();

    if (projectError || !existingProject) {
      throw new Error('Project not found');
    }

    // Default safe scopes if not provided
    const defaultScopes = ['meta', 'h1', 'altText', 'robots', 'sitemap'];
    const finalScopes = body.scopes || defaultScopes;

    // Validate scopes
    const validScopes = ['meta', 'h1', 'robots', 'sitemap', 'altText', 'internalLinks', 'geoPages'];
    const invalidScopes = finalScopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Update project settings
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update({
        autopilot_enabled: body.enabled,
        autopilot_scopes: finalScopes,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.projectId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // If enabling autopilot, perform dry-run validation
    let dryRunResults = null;
    if (body.enabled && existingProject.site_script_status === 'connected') {
      dryRunResults = {
        canApplyFixes: true,
        potentialFixes: finalScopes.length,
        estimatedChanges: Math.floor(Math.random() * 20) + 5 // Mock estimate for now
      };
    }

    console.log('toggle-autopilot completed successfully');
    return new Response(JSON.stringify({
      project,
      dryRunResults,
      message: body.enabled ? 'Autopilot enabled' : 'Autopilot disabled'
    }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('toggle-autopilot error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});