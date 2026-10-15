<#
.SYNOPSIS
    從 SQL Server 的備份產生還原用的 SQL，貼到 Supabase 的 SQL Editor 執行，把進度寫回去。

.DESCRIPTION
    用 Email 對應帳號，所以就算換了一個全新的 Supabase 專案也能還原：
    先在新專案建好 progress 資料表，用同一個 Email 在網站登入一次，再執行這裡產生的 SQL。
    沒登入過的 Email 會被略過（新專案裡還沒有那個帳號）。

.EXAMPLE
    .\Export-RestoreSql.ps1                       # 用最新的備份
    .\Export-RestoreSql.ps1 -Before '2026-10-01'   # 用這個時間點以前最後一次的備份
    .\Export-RestoreSql.ps1 -Email you@gmail.com   # 只還原一個帳號
#>
param(
    [datetime]$Before,
    [string]$Email
)

. (Join-Path $PSScriptRoot 'BackupCommon.ps1')

$config = Get-BackupConfig
$conn = Open-SqlConnection -Config $config -Database $config.sqlServer.database
$rows = @()
try {
    $cmd = $conn.CreateCommand()
    if ($Before) {
        # 每個帳號在指定時間以前最後一筆歷史紀錄
        $cmd.CommandText = @'
SELECT Email, Data, UpdatedAt FROM (
    SELECT Email, Data, UpdatedAt,
           ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY UpdatedAt DESC) AS rn
    FROM dbo.ProgressHistory
    WHERE UpdatedAt < @Before
) h WHERE rn = 1 AND Email IS NOT NULL AND (@Email IS NULL OR Email = @Email)
'@
        [void]$cmd.Parameters.Add('@Before', [System.Data.SqlDbType]::DateTimeOffset)
        $cmd.Parameters['@Before'].Value = [DateTimeOffset]$Before
    } else {
        $cmd.CommandText = 'SELECT Email, Data, UpdatedAt FROM dbo.Progress WHERE Email IS NOT NULL AND (@Email IS NULL OR Email = @Email)'
    }
    [void]$cmd.Parameters.Add('@Email', [System.Data.SqlDbType]::NVarChar, 320)
    if ($Email) { $cmd.Parameters['@Email'].Value = $Email } else { $cmd.Parameters['@Email'].Value = [DBNull]::Value }
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        $rows += [pscustomobject]@{ email = $reader.GetString(0); data = $reader.GetString(1) }
    }
    $reader.Close()
} finally {
    $conn.Dispose()
}

if ($rows.Count -eq 0) { throw '找不到可以還原的備份。' }

$lines = @(
    '-- 一步一步學習日文：還原學習進度（在 Supabase 的 SQL Editor 執行）'
    ('-- 產生時間：{0}，共 {1} 個帳號' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $rows.Count)
    '-- 用 Email 對應帳號；新專案裡還沒登入過的 Email 會被略過。'
    ''
)
foreach ($row in $rows) {
    # JSON 用 dollar quoting 包起來，不用處理引號跳脫
    $tag = '$gojuon$'
    if ($row.data.Contains($tag)) { throw "資料裡有 $tag，無法產生 SQL：$($row.email)" }
    $emailLiteral = $row.email.Replace("'", "''")
    $lines += @(
        "insert into public.progress (user_id, data, updated_at)"
        "select u.id, $tag$($row.data)$tag::jsonb, now()"
        "from auth.users u where lower(u.email) = lower('$emailLiteral')"
        "on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at;"
        ''
    )
}

$out = Join-Path $script:LocalDir ('restore-{0}.sql' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$lines -join "`r`n" | Set-Content -Path $out -Encoding UTF8
Write-Host "已產生還原用的 SQL：$out"
Write-Host '把內容貼到 Supabase 的 SQL Editor 執行，再到網站重新整理就會同步回來。'
