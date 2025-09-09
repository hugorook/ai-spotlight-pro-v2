-- Migration: Add tables for autopilot functionality
-- Created: 2025-09-09

-- Add autopilot columns to projects table if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS autopilot_frequency TEXT DEFAULT 'daily' CHECK (autopilot_frequency IN ('hourly', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS last_autopilot_run TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_autopilot_run TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cms_credentials JSONB DEFAULT '{}';

-- Add rollback columns to recommendations table if they don't exist  
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS target_element TEXT,
ADD COLUMN IF NOT EXISTS current_value TEXT,
ADD COLUMN IF NOT EXISTS suggested_value TEXT,
ADD COLUMN IF NOT EXISTS rollback_token UUID,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add rollback columns to changelog table if they don't exist
ALTER TABLE changelog
ADD COLUMN IF NOT EXISTS rollback_token UUID,
ADD COLUMN IF NOT EXISTS rollback_data JSONB,
ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rollback_reason TEXT,
ADD COLUMN IF NOT EXISTS rollback_result JSONB;

-- Create tracker_logs table for logging issues detected by site script
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

-- Add RLS policies for tracker_logs
ALTER TABLE tracker_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracker logs" ON tracker_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert tracker logs" ON tracker_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracker_logs_project_detected 
  ON tracker_logs(project_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_rollback_token 
  ON recommendations(rollback_token) WHERE rollback_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_changelog_rollback_token 
  ON changelog(rollback_token) WHERE rollback_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_autopilot 
  ON projects(autopilot_enabled, next_autopilot_run) WHERE autopilot_enabled = true;

-- Add helpful comments
COMMENT ON TABLE tracker_logs IS 'Logs of issues detected by the website tracking script';
COMMENT ON COLUMN projects.autopilot_frequency IS 'How often autopilot should run (hourly, daily, weekly)';
COMMENT ON COLUMN projects.cms_credentials IS 'Encrypted CMS API credentials for website modifications';
COMMENT ON COLUMN recommendations.rollback_token IS 'UUID token for safely rolling back applied changes';
COMMENT ON COLUMN changelog.rollback_data IS 'Data needed to rollback the change if necessary';