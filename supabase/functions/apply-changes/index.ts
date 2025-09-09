// Supabase Edge Function: apply-changes
// Deploy: supabase functions deploy apply-changes --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface ApplyChangesRequest {
  projectId: string;
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
    console.log('apply-changes request:', { projectId: body.projectId });

    if (!body.projectId) {
      throw new Error('Project ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the project and verify autopilot is enabled
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', body.projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    if (!project.autopilot_enabled) {
      throw new Error('Autopilot is not enabled for this project');
    }

    if (project.site_script_status !== 'connected') {
      throw new Error('Site script is not connected. Connect your site script first.');
    }

    // Get pending changes/recommendations to apply
    const { data: pendingChanges, error: changesError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('project_id', body.projectId)
      .eq('status', 'todo')
      .in('action_type', project.autopilot_scopes || [])
      .order('impact', { ascending: false })
      .limit(10);

    if (changesError) {
      throw changesError;
    }

    let appliedCount = 0;
    const appliedChanges = [];

    // Apply each change using real website modifications
    for (const change of pendingChanges || []) {
      try {
        // Generate rollback token for safety
        const rollbackToken = crypto.randomUUID();
        
        // Call the website-modifier function to make real changes
        const modificationRequest = {
          projectId: body.projectId,
          actionType: change.action_type,
          target: change.target_element || change.target_page || 'homepage',
          changes: {
            before: change.current_value || '',
            after: change.suggested_value || change.description,
            metadata: change.metadata || {}
          },
          rollbackToken
        };

        console.log('Calling website-modifier for change:', change.id);
        const { data: modificationResult, error: modError } = await supabase.functions.invoke('website-modifier', {
          body: modificationRequest
        });

        if (modError) {
          console.error('Website modification failed:', modError);
          // Mark as failed but don't stop processing other changes
          await supabase
            .from('recommendations')
            .update({
              status: 'failed',
              error_message: modError.message || 'Modification failed'
            })
            .eq('id', change.id);
          continue;
        }

        if (modificationResult?.success) {
          // Update recommendation status to completed
          const { error: updateError } = await supabase
            .from('recommendations')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              rollback_token: rollbackToken
            })
            .eq('id', change.id);

          if (!updateError) {
            appliedCount++;
            appliedChanges.push({
              id: change.id,
              title: change.title,
              type: change.action_type,
              impact: change.impact,
              rollbackToken
            });

            // Log to changelog with rollback data
            await supabase
              .from('changelog')
              .insert({
                project_id: body.projectId,
                recommendation_id: change.id,
                action_type: change.action_type,
                description: change.title,
                scope: change.action_type,
                applied_at: new Date().toISOString(),
                rollback_token: rollbackToken,
                rollback_data: modificationResult.rollbackData,
                diff: {
                  before: modificationRequest.changes.before,
                  after: modificationRequest.changes.after,
                  success: true
                }
              });
          }
        } else {
          // Mark as failed with error details
          await supabase
            .from('recommendations')
            .update({
              status: 'failed',
              error_message: modificationResult?.error || 'Unknown modification error'
            })
            .eq('id', change.id);
        }

      } catch (error) {
        console.error('Error applying change:', change.id, error);
        // Mark as failed
        await supabase
          .from('recommendations')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error)
          })
          .eq('id', change.id);
      }
    }

    console.log('apply-changes completed successfully', { appliedCount });
    return new Response(JSON.stringify({ 
      appliedCount,
      appliedChanges,
      message: `Successfully applied ${appliedCount} changes`
    }), { 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('apply-changes error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      appliedCount: 0
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});