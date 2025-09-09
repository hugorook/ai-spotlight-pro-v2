// Supabase Edge Function: autopilot-scheduler
// Background scheduler for automated website improvements
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface ScheduledJob {
  projectId: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
}

interface AutopilotProject {
  id: string;
  autopilot_enabled: boolean;
  autopilot_scopes: string[];
  site_script_status: string;
  last_autopilot_run?: string;
  autopilot_frequency: 'hourly' | 'daily' | 'weekly';
}

class AutopilotScheduler {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async runScheduledTasks(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: any[];
  }> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const results: any[] = [];

    try {
      // Get all projects with autopilot enabled
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('autopilot_enabled', true)
        .eq('site_script_status', 'connected');

      if (error) {
        throw new Error(`Failed to fetch autopilot projects: ${error.message}`);
      }

      if (!projects || projects.length === 0) {
        console.log('No autopilot projects found');
        return { processed: 0, successful: 0, failed: 0, results: [] };
      }

      console.log(`Found ${projects.length} autopilot projects`);

      // Process each project
      for (const project of projects) {
        processed++;
        
        try {
          const shouldRun = this.shouldRunAutopilot(project);
          
          if (shouldRun) {
            console.log(`Running autopilot for project: ${project.id}`);
            const result = await this.runAutopilotForProject(project);
            
            if (result.success) {
              successful++;
              results.push({
                projectId: project.id,
                status: 'success',
                appliedChanges: result.appliedCount,
                message: result.message
              });
            } else {
              failed++;
              results.push({
                projectId: project.id,
                status: 'failed',
                error: result.error
              });
            }
          } else {
            results.push({
              projectId: project.id,
              status: 'skipped',
              reason: 'Not due for execution'
            });
          }
        } catch (error) {
          failed++;
          results.push({
            projectId: project.id,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      return { processed, successful, failed, results };

    } catch (error) {
      console.error('Scheduler execution failed:', error);
      throw error;
    }
  }

  private shouldRunAutopilot(project: AutopilotProject): boolean {
    const now = new Date();
    const lastRun = project.last_autopilot_run ? new Date(project.last_autopilot_run) : null;
    
    if (!lastRun) {
      // Never run before, should run now
      return true;
    }

    const frequency = project.autopilot_frequency || 'daily';
    const timeSinceLastRun = now.getTime() - lastRun.getTime();
    
    switch (frequency) {
      case 'hourly':
        return timeSinceLastRun >= 60 * 60 * 1000; // 1 hour
      case 'daily':
        return timeSinceLastRun >= 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return timeSinceLastRun >= 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return false;
    }
  }

  private async runAutopilotForProject(project: AutopilotProject): Promise<{
    success: boolean;
    appliedCount?: number;
    message?: string;
    error?: string;
  }> {
    try {
      // Generate new recommendations if needed
      await this.generateRecommendations(project);

      // Apply pending changes using the apply-changes function
      const { data: applyResult, error: applyError } = await this.supabase.functions.invoke('apply-changes', {
        body: { projectId: project.id }
      });

      if (applyError) {
        throw new Error(`Apply changes failed: ${applyError.message}`);
      }

      // Update last run timestamp
      await this.supabase
        .from('projects')
        .update({
          last_autopilot_run: new Date().toISOString()
        })
        .eq('id', project.id);

      return {
        success: true,
        appliedCount: applyResult.appliedCount || 0,
        message: applyResult.message || 'Autopilot completed successfully'
      };

    } catch (error) {
      console.error(`Autopilot failed for project ${project.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async generateRecommendations(project: AutopilotProject): Promise<void> {
    // Check if we have recent recommendations
    const { data: recentRecommendations } = await this.supabase
      .from('recommendations')
      .select('id')
      .eq('project_id', project.id)
      .eq('status', 'todo')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentRecommendations && recentRecommendations.length > 0) {
      // We have recent recommendations, no need to generate new ones
      return;
    }

    // Generate new smart fixes/recommendations
    try {
      console.log(`Generating new recommendations for project: ${project.id}`);
      await this.supabase.functions.invoke('generate-smart-fixes', {
        body: { projectId: project.id }
      });
    } catch (error) {
      console.warn(`Failed to generate recommendations for project ${project.id}:`, error);
      // Don't throw - continue with existing recommendations
    }
  }

  async scheduleAutopilot(projectId: string, frequency: 'hourly' | 'daily' | 'weekly'): Promise<{
    success: boolean;
    nextRun?: string;
    error?: string;
  }> {
    try {
      const nextRun = this.calculateNextRun(frequency);
      
      await this.supabase
        .from('projects')
        .update({
          autopilot_frequency: frequency,
          next_autopilot_run: nextRun.toISOString()
        })
        .eq('id', projectId);

      return {
        success: true,
        nextRun: nextRun.toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private calculateNextRun(frequency: 'hourly' | 'daily' | 'weekly'): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const scheduler = new AutopilotScheduler(supabase);

    if (req.method === 'POST') {
      // Manual trigger or schedule configuration
      const body = await req.json();
      
      if (body.action === 'schedule') {
        // Set up scheduling for a specific project
        const result = await scheduler.scheduleAutopilot(body.projectId, body.frequency);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } else {
        // Manual trigger for all projects
        const result = await scheduler.runScheduledTasks();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    } else if (req.method === 'GET') {
      // Cron trigger - run scheduled tasks
      console.log('Cron trigger: Running scheduled autopilot tasks');
      const result = await scheduler.runScheduledTasks();
      
      return new Response(JSON.stringify({
        message: 'Scheduled tasks completed',
        ...result,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('Autopilot scheduler error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});

// Set up cron job to run every hour
// This requires Deno Deploy or similar platform that supports cron
if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
  // In production, this would be set up as a cron job in Deno Deploy
  console.log('Autopilot scheduler deployed - cron jobs should be configured externally');
}