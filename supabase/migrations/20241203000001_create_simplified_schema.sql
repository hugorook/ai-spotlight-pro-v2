-- Migration: Create simplified outcome-first schema
-- Created: 2024-12-03

-- Projects table (one per connected site)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  cms_provider TEXT CHECK (cms_provider IN ('webflow', 'wordpress', 'manual')) DEFAULT 'manual',
  site_script_status TEXT CHECK (site_script_status IN ('connected', 'missing')) DEFAULT 'missing',
  autopilot_enabled BOOLEAN DEFAULT false,
  autopilot_scopes JSONB DEFAULT '["meta", "h1", "robots", "sitemap", "altText"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt results (wins) - what the site already appears for
CREATE TABLE IF NOT EXISTS prompt_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  appears BOOLEAN NOT NULL DEFAULT false,
  rank INTEGER,
  url TEXT,
  last_seen TIMESTAMPTZ,
  source JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_results_project_appears ON prompt_results(project_id, appears);
CREATE INDEX IF NOT EXISTS idx_prompt_results_last_seen ON prompt_results(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_results_rank ON prompt_results(rank ASC) WHERE appears = true;

-- Recommendations (non-automatable, human tasks)
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('High', 'Medium', 'Low')) NOT NULL,
  effort TEXT CHECK (effort IN ('High', 'Medium', 'Low')) NOT NULL,
  action_type TEXT NOT NULL,
  suggested_owner TEXT CHECK (suggested_owner IN ('Content', 'PR', 'Dev')) NOT NULL,
  links JSONB DEFAULT '[]'::jsonb,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tech fixes queue for autopilot
CREATE TABLE IF NOT EXISTS change_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT CHECK (status IN ('queued', 'applied', 'failed', 'rolled_back')) DEFAULT 'queued',
  applied_at TIMESTAMPTZ,
  error TEXT,
  rollback_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Changelog of applied changes with rollback capability
CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  before JSONB DEFAULT '{}'::jsonb,
  after JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'autopilot',
  applied_by TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  rollback_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own project data" ON prompt_results FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can access own recommendations" ON recommendations FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can access own change jobs" ON change_jobs FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can access own change log" ON change_log FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

-- Create default project for existing users (migration helper)
-- This will be handled by the application logic

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recommendations_project_status ON recommendations(project_id, status);
CREATE INDEX IF NOT EXISTS idx_change_jobs_project_status ON change_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_change_log_project_recent ON change_log(project_id, applied_at DESC);