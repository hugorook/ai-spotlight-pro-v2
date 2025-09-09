-- Create autopilot schema tables
-- This creates the missing tables for the autopilot system

-- Create projects table (main table for website projects)
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

-- Create recommendations table (stores SEO improvement suggestions)
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

-- Create changelog table (audit trail of all changes)
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

-- Create tracker_logs table (logs from website tracking script)
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

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects table
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for recommendations table
CREATE POLICY "Users can view recommendations for their projects" ON recommendations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage recommendations" ON recommendations
  FOR ALL WITH CHECK (true);

-- Create RLS policies for changelog table  
CREATE POLICY "Users can view changelog for their projects" ON changelog
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage changelog" ON changelog
  FOR ALL WITH CHECK (true);

-- Create RLS policies for tracker_logs table
CREATE POLICY "Users can view their own tracker logs" ON tracker_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert tracker logs" ON tracker_logs
  FOR INSERT WITH CHECK (true);

-- Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_autopilot_enabled ON projects(autopilot_enabled) WHERE autopilot_enabled = true;
CREATE INDEX IF NOT EXISTS idx_recommendations_project_id ON recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_rollback_token ON recommendations(rollback_token) WHERE rollback_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_changelog_project_id ON changelog(project_id);
CREATE INDEX IF NOT EXISTS idx_changelog_rollback_token ON changelog(rollback_token) WHERE rollback_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracker_logs_project_detected ON tracker_logs(project_id, detected_at DESC);

-- Add helpful comments
COMMENT ON TABLE projects IS 'Website projects with CMS integration and autopilot settings';
COMMENT ON TABLE recommendations IS 'SEO improvement recommendations generated by the system';
COMMENT ON TABLE changelog IS 'Audit trail of all changes applied to websites';
COMMENT ON TABLE tracker_logs IS 'Logs of issues detected by the website tracking script';

COMMENT ON COLUMN projects.cms_credentials IS 'Encrypted CMS API credentials for website modifications';
COMMENT ON COLUMN projects.autopilot_scopes IS 'Array of allowed modification types (meta, h1, altText, etc.)';
COMMENT ON COLUMN recommendations.rollback_token IS 'UUID token for safely rolling back applied changes';
COMMENT ON COLUMN changelog.rollback_data IS 'Data needed to rollback the change if necessary';