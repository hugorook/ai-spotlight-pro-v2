-- Weekly snapshots table and lightweight per-company settings

-- weekly_snapshots table per spec
create table if not exists public.weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.companies(id) on delete cascade,
  week_start date not null,
  visibility_score numeric not null,
  wow_delta numeric not null,
  mention_rate numeric,
  avg_position numeric,
  model_coverage jsonb,
  win_streak int default 0,
  forecast numeric,
  biggest_wins jsonb,
  biggest_losses jsonb,
  created_at timestamptz default now(),
  unique (brand_id, week_start)
);

-- Enable RLS and basic policies similar to other tables
alter table if exists public.weekly_snapshots enable row level security;
create policy if not exists weekly_snapshots_select_own on public.weekly_snapshots
  for select using (
    exists (
      select 1 from public.companies c
      where c.id = weekly_snapshots.brand_id and c.user_id = auth.uid()
    )
  );

-- Lightweight per-company settings for model weights and alert thresholds
create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  model_share_weights jsonb not null default '{"openai-gpt-4o-mini": 1}'::jsonb,
  stage_weights jsonb not null default '{"awareness": 0.3, "consideration": 0.4, "comparison": 0.3}'::jsonb,
  alert_thresholds jsonb not null default '{"score_drop_pct": 15, "coverage_min": 0.5, "neg_sentiment_spike": 0.2}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table if exists public.company_settings enable row level security;
create policy if not exists company_settings_crud_own on public.company_settings
  for all using (
    exists (
      select 1 from public.companies c
      where c.id = company_settings.company_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.companies c
      where c.id = company_settings.company_id and c.user_id = auth.uid()
    )
  );

