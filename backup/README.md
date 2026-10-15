# 學習進度備份（Supabase → 家裡電腦的 SQL Server）

Supabase 免費版沒有自動備份，專案被刪除或暫停太久，雲端的進度就沒了。這些 PowerShell 腳本每天把進度備份到家裡的 Windows 電腦。

**第一次設定**：在家裡電腦用 Claude Code 打開這個專案，說「照 backup/CLAUDE-SETUP.md 幫我設定學習進度備份」，Claude 會一步一步帶你做完。也可以自己照 [CLAUDE-SETUP.md](CLAUDE-SETUP.md) 的步驟操作。

## 備份了什麼、存在哪裡

| 位置 | 內容 |
|---|---|
| SQL Server `LearningJapanese.dbo.Progress` | 每個帳號最新的一份進度（含 Email） |
| SQL Server `LearningJapanese.dbo.ProgressHistory` | 進度每次有變化就多一筆，可以還原到過去 |
| `backup\local\snapshots\progress-*.json` | 每次備份的完整 JSON 快照，保留 30 天 |
| `backup\local\logs\backup-yyyyMM.log` | 每次備份的結果 |

## 運作方式

```
Supabase（雲端）                                  家裡的 Windows 電腦
public.progress ──┐
auth.users ───────┴─ backup.progress_with_email ─→ Backup-Progress.ps1 ─→ SQL Server + JSON 快照
                     （唯讀帳號 backup_reader）       （工作排程器每天執行）
```

- 用專用的唯讀帳號 `backup_reader` 連線：只能讀 `backup.progress_with_email` 這個檢視表，不能改任何資料。
- 這個帳號的密碼是隨機產生的，用 Windows DPAPI 加密存在 `backup\local\supabase-credential.xml`，只有同一台電腦的同一個 Windows 帳號解得開，不會進 Git。
- 連線走 Supabase 的 Session pooler（IPv4、SSL 加密）。

## 檔案

| 檔案 | 用途 |
|---|---|
| `New-BackupConfig.ps1` | 第一次設定：產生密碼、設定檔，和要貼到 Supabase 的 SQL |
| `Initialize-BackupDatabase.ps1` | 在 SQL Server 建資料庫和資料表 |
| `Backup-Progress.ps1` | 執行一次備份（排程每天跑這支） |
| `Register-BackupTask.ps1` | 建立 Windows 工作排程 |
| `Export-RestoreSql.ps1` | 從備份產生還原用的 SQL |
| `sql\supabase-backup-reader.sql` | Supabase 唯讀帳號和檢視表（範本） |
| `sql\sqlserver-schema.sql` | SQL Server 資料表定義 |
| `local\` | 這台電腦專用的設定、密碼、快照、記錄（不會 commit） |

## 手動備份

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Backup-Progress.ps1
```

## 還原

1. 產生還原用的 SQL：

   ```powershell
   # 用最新的備份
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Export-RestoreSql.ps1
   # 還原到某個時間點以前的版本
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Export-RestoreSql.ps1 -Before '2026-10-01'
   # 只還原一個帳號
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Export-RestoreSql.ps1 -Email you@gmail.com
   ```

2. 打開產生的 `backup\local\restore-*.sql`，貼到 Supabase 的 SQL Editor 執行。
3. 網站重新整理，進度就會同步回來。

還原是**用 Email 對應帳號**，所以換到全新的 Supabase 專案也能用：先在新專案建好資料表（`supabase/migrations/`），用同一個 Email 在網站登入一次，再執行還原 SQL。

> 網站的同步規則是「進度只增不減」：如果裝置上的進度比備份新，同步後會保留比較多的那一邊。

## 停用

```powershell
Unregister-ScheduledTask -TaskName 'LearningJapanese-ProgressBackup' -Confirm:$false
```

Supabase 那邊要移除唯讀帳號，在 SQL Editor 執行：

```sql
drop owned by backup_reader;
drop role backup_reader;
drop schema backup cascade;
```
