# 給 Claude 的執行說明：設定學習進度自動備份

> **使用方式**：在家裡的 Windows 電腦用 Claude Code 打開這個專案，對 Claude 說：
>
> ```
> 照 backup/CLAUDE-SETUP.md 幫我設定學習進度備份
> ```

---

## Claude 請先讀這段

你要在使用者的 **Windows 電腦**上，把「一步一步學習日文」網站存在 Supabase 的學習進度，設定成每天自動備份到這台電腦的 **SQL Server**。

規則：

- 一律用**繁體中文、台灣用語**回覆。使用者是全端工程師，可以講技術細節，但每一步要說清楚在做什麼。
- 照下面的步驟**依序**做，每一步做完確認結果再往下。標了 **【使用者】** 的步驟需要使用者自己操作，請停下來說明要做什麼，等使用者回覆再繼續。
- 執行 PowerShell 腳本一律用：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File <腳本路徑> <參數>`（Windows PowerShell 5.1，排程也是用它跑）。
- **不要讀取、顯示或複製** `backup\local\supabase-setup.sql` 和 `backup\local\supabase-credential.xml` 的內容，裡面有資料庫密碼。需要使用者處理時，只告訴他檔案路徑。
- `backup\local\` 已經在 `.gitignore` 裡，**不要 commit 或 push** 這個資料夾裡的任何檔案。
- 不要改 Supabase 的任何東西，除了請使用者在 SQL Editor 執行第 4 步產生的 SQL。
- 遇到錯誤先看「疑難排解」，還是不行就把錯誤訊息和你判斷的原因告訴使用者，不要自己亂試。

已知資訊：

- Supabase 專案 ID（Project ref）：`hweyprfnmxgbzhhilzru`
- 網站：https://xiouyu.github.io/learning-japanese/
- 腳本都在 `backup\` 資料夾，說明見 `backup\README.md`

---

## 第 1 步：檢查 SQL Server

找出 SQL Server 執行個體名稱：

```powershell
Get-Service -Name 'MSSQL*' | Select-Object Name, Status, DisplayName
```

- `MSSQLSERVER` → 執行個體寫 `localhost`
- `MSSQL$SQLEXPRESS` → 寫 `localhost\SQLEXPRESS`（其他名稱以此類推：`localhost\<名稱>`）
- 服務是 Stopped：請使用者確認要不要啟動（`Start-Service`，可能需要系統管理員權限）。
- 完全沒有：告訴使用者這台電腦沒有 SQL Server，建議安裝 SQL Server 2022 Express（免費），等他裝好再繼續。

用 Windows 驗證測試連線（把 `<執行個體>` 換掉）：

```powershell
$c = New-Object System.Data.SqlClient.SqlConnection('Server=<執行個體>;Database=master;Integrated Security=True;TrustServerCertificate=True;')
$c.Open(); $c.ServerVersion; $c.Close()
```

印出版本號就成功。SQL Server 版本要 2016（13.x）以上，才支援 `ISJSON`。

如果使用者的 SQL Server 只能用 SQL 帳號密碼登入，第 3 步改用 `-SqlConnectionString` 參數，**請使用者自己在終端機輸入**含密碼的連線字串，你不要經手密碼。

## 第 2 步：安裝 PostgreSQL ODBC 驅動程式（psqlODBC）

Supabase 是 PostgreSQL，Windows PowerShell 要透過 ODBC 連線。先檢查有沒有裝：

```powershell
Get-OdbcDriver -Platform 64-bit | Where-Object Name -like 'PostgreSQL*' | Select-Object Name
```

有 `PostgreSQL Unicode(x64)` 就跳到第 3 步。沒有的話：

1. 先試 winget：`winget search psqlodbc`，有找到就用 `winget install --id <找到的 Id> -e` 安裝。
2. winget 沒有的話，**【使用者】** 請使用者到官方下載頁 https://www.postgresql.org/ftp/odbc/releases/ ，點最新的 `REL-...` 資料夾，下載 `psqlodbc_x64.msi` 並安裝（需要系統管理員權限）。

裝完再跑一次上面的檢查指令確認。

## 第 3 步：【使用者】提供 Supabase 連線位址

請使用者：

1. 打開 Supabase 專案頁面，按上方的 **Connect**。
2. 選 **Session pooler**（不要選 Direct connection，家用網路通常連不到它的 IPv6）。
3. 把連線資訊裡的 **host** 告訴你，長得像 `aws-0-ap-northeast-1.pooler.supabase.com`。**只要 host，不要貼密碼。**

## 第 4 步：產生設定和唯讀帳號

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\New-BackupConfig.ps1 -PoolerHost <第3步的host> -ProjectRef hweyprfnmxgbzhhilzru -SqlServer '<第1步的執行個體>'
```

這會：

- 產生一組隨機密碼，用 Windows DPAPI 加密存在 `backup\local\supabase-credential.xml`（只有這台電腦的這個 Windows 帳號解得開）
- 寫設定檔 `backup\local\config.json`
- 產生 `backup\local\supabase-setup.sql`（含密碼）

接著 **【使用者】**：

1. 用記事本打開 `backup\local\supabase-setup.sql`（可以幫他執行 `notepad backup\local\supabase-setup.sql`，但你不要讀內容）。
2. 全選複製，貼到 Supabase 的 **SQL Editor** › **New query**，按 **Run**。
3. 看到 `Success. No rows returned` 就完成。

這段 SQL 會建立只能讀取學習進度的帳號 `backup_reader`，以及附帶 Email 的檢視表 `backup.progress_with_email`。這個帳號不能修改任何資料，也讀不到其他資料表。

使用者回報執行成功後，刪掉含密碼的檔案：

```powershell
Remove-Item backup\local\supabase-setup.sql
```

## 第 5 步：建立 SQL Server 資料庫

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Initialize-BackupDatabase.ps1
```

會建立資料庫 `LearningJapanese`，裡面有：

- `dbo.Progress`：每個帳號最新的一份進度
- `dbo.ProgressHistory`：每次進度有變化就多一筆，可以還原到過去

## 第 6 步：手動備份一次

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Backup-Progress.ps1
echo "exit code: $LASTEXITCODE"
```

成功會印出「備份完成：N 個帳號…」，結束代碼 0。再確認資料進了 SQL Server：

```powershell
$c = New-Object System.Data.SqlClient.SqlConnection('Server=<執行個體>;Database=LearningJapanese;Integrated Security=True;TrustServerCertificate=True;')
$c.Open(); $cmd = $c.CreateCommand()
$cmd.CommandText = "SELECT Email, JSON_VALUE(Data, '$.passed') AS Passed, UpdatedAt FROM dbo.Progress"
$r = $cmd.ExecuteReader(); while ($r.Read()) { '{0}  通過 {1} 步  {2}' -f $r[0], $r[1], $r[2] }; $c.Close()
```

應該看得到使用者的 Email 和目前通過幾步，可以請使用者對照網站上的進度。

## 第 7 步：設定每天自動備份

問使用者每天幾點備份（預設晚上 9 點，電腦通常開著的時間比較好；當時關機的話，下次開機登入會補跑）：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backup\Register-BackupTask.ps1 -At 21:00
Start-ScheduledTask -TaskName 'LearningJapanese-ProgressBackup'
Start-Sleep -Seconds 15
Get-ScheduledTaskInfo -TaskName 'LearningJapanese-ProgressBackup' | Select-Object LastRunTime, LastTaskResult, NextRunTime
```

`LastTaskResult` 是 `0` 就代表排程跑成功。

## 第 8 步：完成，跟使用者說明

用幾行告訴使用者：

- 每天幾點會自動備份，存在 SQL Server 的 `LearningJapanese` 資料庫，另外在 `backup\local\snapshots\` 留 30 天的 JSON 檔
- 備份紀錄在 `backup\local\logs\`
- 要還原時執行 `backup\Export-RestoreSql.ps1`，詳見 `backup\README.md` 的「還原」
- 每天自動連一次 Supabase，一般也能避免免費專案因為 7 天沒使用而被暫停

---

## 疑難排解

| 錯誤訊息 | 原因和處理 |
|---|---|
| `找不到 PostgreSQL ODBC 驅動程式` | 第 2 步沒裝好，或裝成 32 位元版。要裝 `psqlodbc_x64.msi`。 |
| `password authentication failed for user "backup_reader"` | 第 4 步的 SQL 沒在 Supabase 執行成功，或之後又重新跑過 `New-BackupConfig.ps1`（會換新密碼）。重新跑第 4 步，把新的 SQL 再貼到 Supabase 執行一次。 |
| `Tenant or user not found` | 使用者名稱或 host 不對。確認 host 是 **Session pooler** 的，使用者名稱要是 `backup_reader.hweyprfnmxgbzhhilzru`（`local\config.json` 的 `supabase.user`）。 |
| `could not translate host name` / 連線逾時 | 網路問題，或 host 打錯。也可能是 Supabase 專案被暫停了：請使用者到 Supabase 後台按 **Restore**。 |
| `permission denied for view progress_with_email` | 第 4 步的 SQL 沒有完整執行，請使用者再執行一次。 |
| SQL Server `Login failed` / `A network-related error` | 第 1 步的執行個體名稱不對，或 SQL Server 服務沒啟動。修正後用 `-KeepPassword` 重新產生設定：`New-BackupConfig.ps1 ... -SqlServer '<正確名稱>' -KeepPassword`（不會換密碼，不用重貼 SQL）。 |
| 腳本裡的中文變成亂碼、出現語法錯誤 | `.ps1` 檔要是 **UTF-8 with BOM**。如果被編輯器存成沒有 BOM，Windows PowerShell 5.1 會用 Big5 讀取。用 VS Code 右下角的編碼改回「UTF-8 with BOM」再存檔。 |
| 工作排程的 `LastTaskResult` 不是 0 | 看 `backup\local\logs\` 最新的 log。排程是用使用者自己的 Windows 帳號、在登入時執行；密碼檔只有同一個帳號解得開。 |
