-- 一步一步學習日文：備份用的唯讀帳號（在 Supabase 的 SQL Editor 執行）
--
-- 建立一個只能讀取「學習進度 + Email」的帳號 backup_reader，給家裡電腦的備份腳本用。
-- 這個帳號不能新增、修改或刪除任何資料，也讀不到其他資料表。
-- {{PASSWORD}} 會由 New-BackupConfig.ps1 自動填入隨機密碼，請不要手動改成簡單的密碼。

-- 1. 放備份用檢視表的 schema（不在 API 公開的 schema 裡，網站前端讀不到）
create schema if not exists backup;
revoke all on schema backup from public;

-- 2. 學習進度加上 Email：之後如果要搬到新的 Supabase 專案，靠 Email 對回帳號
create or replace view backup.progress_with_email as
select
  p.user_id,
  u.email::text as email,
  p.data,
  p.updated_at
from public.progress p
left join auth.users u on u.id = p.user_id;

revoke all on backup.progress_with_email from public;

-- 3. 唯讀帳號（已經存在就只更新密碼）
do $$
begin
  if not exists (select from pg_roles where rolname = 'backup_reader') then
    create role backup_reader with login password '{{PASSWORD}}';
  else
    alter role backup_reader with login password '{{PASSWORD}}';
  end if;
end
$$;

grant usage on schema backup to backup_reader;
grant select on backup.progress_with_email to backup_reader;
