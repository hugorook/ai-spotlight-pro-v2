-- Prompts table for Saved Prompt Library
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  text text not null,
  tags text[] not null default '{}'
);

alter table public.prompts enable row level security;

-- Policies: owner (companies.user_id) can CRUD their prompts
create policy if not exists prompts_select_own on public.prompts
  for select using (
    exists (
      select 1 from public.companies c where c.id = prompts.company_id and c.user_id = auth.uid()
    )
  );

create policy if not exists prompts_insert_own on public.prompts
  for insert with check (
    exists (
      select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()
    )
  );

create policy if not exists prompts_update_own on public.prompts
  for update using (
    exists (
      select 1 from public.companies c where c.id = prompts.company_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()
    )
  );

create policy if not exists prompts_delete_own on public.prompts
  for delete using (
    exists (
      select 1 from public.companies c where c.id = prompts.company_id and c.user_id = auth.uid()
    )
  );

-- Schedules table for job preferences
create table if not exists public.schedules (
  company_id uuid primary key references public.companies(id) on delete cascade,
  weekly_health_check boolean not null default false,
  monthly_competitor_retest boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.schedules enable row level security;

create policy if not exists schedules_crud_own on public.schedules
  for all using (
    exists (
      select 1 from public.companies c where c.id = schedules.company_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()
    )
  );

