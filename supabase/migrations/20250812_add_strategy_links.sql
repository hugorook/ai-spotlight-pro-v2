-- Link strategies to source ai_test if strategies table exists
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='strategies') then
    if not exists (
      select 1 from information_schema.columns 
      where table_schema='public' and table_name='strategies' and column_name='ai_test_id'
    ) then
      alter table public.strategies add column ai_test_id uuid references public.ai_tests(id) on delete set null;
    end if;
  end if;
end $$;

