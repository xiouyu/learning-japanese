<#
.SYNOPSIS
    在 SQL Server 建立備份用的資料庫和資料表（重複執行也沒關係）。
#>
. (Join-Path $PSScriptRoot 'BackupCommon.ps1')

$config = Get-BackupConfig
$database = $config.sqlServer.database
if ($database -notmatch '^[A-Za-z0-9_]+$') { throw "資料庫名稱只能用英數字和底線：$database" }

$sql = Get-Content -Path (Join-Path $PSScriptRoot 'sql\sqlserver-schema.sql') -Raw -Encoding UTF8
$sql = $sql.Replace('$(Database)', $database)
# 跟 sqlcmd 一樣，用單獨一行的 GO 分段執行
$batches = [regex]::Split($sql, '(?im)^\s*GO\s*$') | Where-Object { $_.Trim() }

$conn = Open-SqlConnection -Config $config -Database 'master'
try {
    foreach ($batch in $batches) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $batch
        [void]$cmd.ExecuteNonQuery()
    }
} finally {
    $conn.Dispose()
}
Write-Host "SQL Server 資料庫 $database 已就緒（dbo.Progress、dbo.ProgressHistory）。"
