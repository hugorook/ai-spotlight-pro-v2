-- Lightweight audit/events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  company_id uuid,
  type text not null,
  payload jsonb not null default '{}'::jsonb
);
alter table public.events enable row level security;

-- Allow insert by authenticated users; read own company events
drop policy if exists events_insert_auth on public.events;
create policy events_insert_auth on public.events for insert with check (auth.role() = 'authenticated');

drop policy if exists events_select_own_company on public.events;
create policy events_select_own_company on public.events for select using (
  exists (
    select 1 from public.companies c
    where c.id = events.company_id and c.user_id = auth.uid()
  )
);

