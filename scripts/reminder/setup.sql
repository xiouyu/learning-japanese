-- 一步一步學習日文：每日提醒用的唯讀帳號（在 Supabase 的 SQL Editor 整份貼上執行）
--
-- 建立帳號 reminder_reader，只能用 Email 查「每天做了幾題」和最後同步時間，
-- 讀不到其他資料，也不能新增、修改或刪除任何東西。
-- 執行完最下面會顯示一組隨機密碼，複製到 GitHub 的 REMINDER_DB_PASSWORD。
-- 再執行一次會換一組新密碼（舊的就不能用了）。

-- 1. 放提醒用函式的 schema（不在 API 公開的 schema 裡，網站前端呼叫不到）
create schema if not exists reminder;
revoke all on schema reminder from public;

-- 2. 用 Email 查每天的題數（data.daily）和最後同步時間；只回傳這兩樣
create or replace function reminder.daily_of(p_email text)
returns table (daily jsonb, synced_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.data -> 'daily', '{}'::jsonb), p.updated_at
  from auth.users u
  join public.progress p on p.user_id = u.id
  where lower(u.email) = lower(p_email);
$$;

revoke all on function reminder.daily_of(text) from public, anon, authenticated;

-- 3. 唯讀帳號，密碼隨機產生（已經存在就換一組新密碼）
do $$
declare
  pw text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not exists (select from pg_roles where rolname = 'reminder_reader') then
    execute format('create role reminder_reader with login password %L', pw);
  else
    execute format('alter role reminder_reader with login password %L', pw);
  end if;
  perform set_config('reminder.new_password', pw, false);
end
$$;

grant usage on schema reminder to reminder_reader;
grant execute on function reminder.daily_of(text) to reminder_reader;

-- 4. 新密碼：複製到 GitHub 的 REMINDER_DB_PASSWORD
select current_setting('reminder.new_password') as "REMINDER_DB_PASSWORD（複製這個）";
