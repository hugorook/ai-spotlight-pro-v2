-- Public, read-only share slugs for weekly snapshots
create table if not exists public.public_shares (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  slug text not null unique
);

alter table if exists public.public_shares enable row level security;
-- Allow owners to manage their share links
create policy if not exists public_shares_crud_own on public.public_shares
  for all using (
    exists (
      select 1 from public.companies c where c.id = public_shares.company_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.companies c where c.id = public_shares.company_id and c.user_id = auth.uid()
    )
  );

