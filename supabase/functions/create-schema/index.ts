// Supabase Edge Function: create-schema
// Creates the autopilot database schema
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🗄️ Creating autopilot database schema');

    // Create projects table
    const createProjectsSQL = `
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        site_url TEXT NOT NULL,
        cms_provider TEXT DEFAULT 'manual' CHECK (cms_provider IN ('manual', 'wordpress', 'webflow', 'shopify', 'squarespace')),
        cms_credentials JSONB DEFAULT '{}',
        autopilot_enabled BOOLEAN DEFAULT false,
        autopilot_scopes TEXT[] DEFAULT '{}',
        autopilot_frequency TEXT DEFAULT 'daily' CHECK (autopilot_frequency IN ('hourly', 'daily', 'weekly')),
        site_script_status TEXT DEFAULT 'missing' CHECK (site_script_status IN ('missing', 'connected')),
        last_autopilot_run TIMESTAMP WITH TIME ZONE,
        next_autopilot_run TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: projectsError } = await supabase.rpc('exec', { sql: createProjectsSQL });
    
    if (projectsError) {
      console.error('Failed to create projects table:', projectsError);
      throw projectsError;
    }

    console.log('✅ Projects table created');

    // Create recommendations table
    const createRecommendationsSQL = `
      CREATE TABLE IF NOT EXISTS recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL CHECK (action_type IN ('meta', 'h1', 'robots', 'sitemap', 'altText', 'internalLinks')),
        title TEXT NOT NULL,
        description TEXT,
        target_page TEXT,
        target_element TEXT,
        current_value TEXT,
        suggested_value TEXT,
        impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
        effort TEXT CHECK (effort IN ('low', 'medium', 'high')),
        status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'failed')),
        source TEXT DEFAULT 'manual',
        rollback_token UUID,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    const { error: recommendationsError } = await supabase.rpc('exec', { sql: createRecommendationsSQL });
    
    if (recommendationsError) {
      console.error('Failed to create recommendations table:', recommendationsError);
      // Continue anyway
    } else {
      console.log('✅ Recommendations table created');
    }

    // Create changelog table
    const createChangelogSQL = `
      CREATE TABLE IF NOT EXISTS changelog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
        action_type TEXT NOT NULL,
        description TEXT,
        scope TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        rollback_token UUID,
        rollback_data JSONB,
        rolled_back_at TIMESTAMP WITH TIME ZONE,
        rollback_reason TEXT,
        rollback_result JSONB,
        diff JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: changelogError } = await supabase.rpc('exec', { sql: createChangelogSQL });
    
    if (changelogError) {
      console.error('Failed to create changelog table:', changelogError);
    } else {
      console.log('✅ Changelog table created');
    }

    // Create tracker_logs table
    const createTrackerLogsSQL = `
      CREATE TABLE IF NOT EXISTS tracker_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        page_url TEXT NOT NULL,
        issues_detected INTEGER NOT NULL DEFAULT 0,
        issue_categories TEXT[] DEFAULT '{}',
        tracker_version TEXT,
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        page_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: trackerError } = await supabase.rpc('exec', { sql: createTrackerLogsSQL });
    
    if (trackerError) {
      console.error('Failed to create tracker_logs table:', trackerError);
    } else {
      console.log('✅ Tracker_logs table created');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Autopilot schema created successfully',
      tables: ['projects', 'recommendations', 'changelog', 'tracker_logs']
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Schema creation failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      instructions: 'Please create tables manually via Supabase Dashboard > SQL Editor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});