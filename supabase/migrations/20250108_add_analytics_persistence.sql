-- Analytics persistence tables for cross-device/session data storage
-- Created: 2025-01-08

-- Health check sessions - stores complete health check runs
CREATE TABLE IF NOT EXISTS health_check_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  website_url TEXT, -- For URL-only workflow
  company_data JSONB, -- Extracted company data for URL-only workflow
  prompts_used JSONB NOT NULL, -- Array of prompts used in this session
  total_prompts INTEGER NOT NULL,
  mention_rate NUMERIC(5,2), -- Percentage
  average_position NUMERIC(5,2),
  health_score INTEGER,
  session_type TEXT CHECK (session_type IN ('company_profile', 'url_only')) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics data storage - stores all analytics results
CREATE TABLE IF NOT EXISTS analytics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_check_session_id UUID REFERENCES health_check_sessions(id) ON DELETE CASCADE,
  analytics_type TEXT CHECK (analytics_type IN ('website_analysis', 'authority_analysis', 'trending_opportunities', 'industry_benchmark')) NOT NULL,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated prompts storage - for persistent prompt library
CREATE TABLE IF NOT EXISTS generated_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  company_data JSONB NOT NULL, -- Extracted company info
  prompts JSONB NOT NULL, -- Array of generated prompts with metadata
  prompt_count INTEGER NOT NULL,
  generation_method TEXT CHECK (generation_method IN ('url_analysis', 'manual_input')) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test results linked to health check sessions
ALTER TABLE ai_tests ADD COLUMN IF NOT EXISTS health_check_session_id UUID REFERENCES health_check_sessions(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_check_sessions_user_recent ON health_check_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_data_user_type ON analytics_data(user_id, analytics_type);
CREATE INDEX IF NOT EXISTS idx_analytics_data_session ON analytics_data(health_check_session_id);
CREATE INDEX IF NOT EXISTS idx_generated_prompts_user_recent ON generated_prompts(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_prompts_website ON generated_prompts(website_url);

-- Enable Row Level Security
ALTER TABLE health_check_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage own health check sessions" ON health_check_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own analytics data" ON analytics_data FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own generated prompts" ON generated_prompts FOR ALL USING (auth.uid() = user_id);