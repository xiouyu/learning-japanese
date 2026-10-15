-- 五十音練習帳：每個帳號一列學習紀錄
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 只能讀寫自己的紀錄
alter table public.progress enable row level security;

create policy "讀取自己的進度" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "新增自己的進度" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "更新自己的進度" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
