-- Prompts table for Saved Prompt Library
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  text text not null,
  tags text[] not null default '{}'
);

alter table public.prompts enable row level security;

-- Policy: prompts_select_own (create only if missing)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'prompts_select_own'
  ) then
    create policy prompts_select_own on public.prompts
      for select using (
        exists (
          select 1 from public.companies c where c.id = prompts.company_id and c.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: prompts_insert_own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'prompts_insert_own'
  ) then
    create policy prompts_insert_own on public.prompts
      for insert with check (
        exists (
          select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: prompts_update_own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'prompts_update_own'
  ) then
    create policy prompts_update_own on public.prompts
      for update using (
        exists (
          select 1 from public.companies c where c.id = prompts.company_id and c.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: prompts_delete_own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'prompts_delete_own'
  ) then
    create policy prompts_delete_own on public.prompts
      for delete using (
        exists (
          select 1 from public.companies c where c.id = prompts.company_id and c.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Schedules table for job preferences
create table if not exists public.schedules (
  company_id uuid primary key references public.companies(id) on delete cascade,
  weekly_health_check boolean not null default false,
  monthly_competitor_retest boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.schedules enable row level security;

-- Policy: schedules_crud_own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'schedules' and policyname = 'schedules_crud_own'
  ) then
    create policy schedules_crud_own on public.schedules
      for all using (
        exists (
          select 1 from public.companies c where c.id = schedules.company_id and c.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()
        )
      );
  end if;
end $$;

