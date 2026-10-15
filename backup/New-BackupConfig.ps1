<#
.SYNOPSIS
    建立備份設定：產生 Supabase 唯讀帳號的隨機密碼、存設定檔，並產生要貼到 Supabase SQL Editor 的 SQL。

.EXAMPLE
    .\New-BackupConfig.ps1 -PoolerHost aws-0-ap-northeast-1.pooler.supabase.com -ProjectRef hweyprfnmxgbzhhilzru

.NOTES
    密碼不會顯示在畫面上：只會寫進 local\supabase-credential.xml（加密）和 local\supabase-setup.sql。
    把 local\supabase-setup.sql 的內容貼到 Supabase 執行後，可以刪掉那個檔案。
#>
param(
    # Supabase「Connect › Session pooler」裡的 host，例如 aws-0-ap-northeast-1.pooler.supabase.com
    [Parameter(Mandatory = $true)][string]$PoolerHost,
    # Supabase 專案 ID（網址 https://<這一段>.supabase.co）
    [Parameter(Mandatory = $true)][string]$ProjectRef,
    [int]$PoolerPort = 5432,
    # SQL Server 執行個體，例如 localhost、localhost\SQLEXPRESS、.\SQLEXPRESS
    [string]$SqlServer = 'localhost',
    [string]$Database = 'LearningJapanese',
    # 直接指定完整的 SQL Server 連線字串（例如要用 SQL 帳號密碼登入時）；有給就不用 -SqlServer
    [string]$SqlConnectionString,
    # PostgreSQL ODBC 驅動程式名稱；不給就自動找
    [string]$OdbcDriver,
    [string]$SslMode = 'require',
    # 本機 JSON 快照保留幾天
    [int]$KeepDays = 30,
    # 已經有密碼了（例如重新產生設定檔），就不要換新密碼
    [switch]$KeepPassword
)

. (Join-Path $PSScriptRoot 'BackupCommon.ps1')

if (-not (Test-Path $script:LocalDir)) { New-Item -ItemType Directory -Path $script:LocalDir -Force | Out-Null }

# 找 PostgreSQL ODBC 驅動程式（psqlODBC）
if (-not $OdbcDriver) {
    if (Get-Command Get-OdbcDriver -ErrorAction SilentlyContinue) {
        $found = Get-OdbcDriver -Platform 64-bit | Where-Object { $_.Name -like 'PostgreSQL Unicode*' } | Select-Object -First 1
        if (-not $found) {
            throw '找不到 PostgreSQL ODBC 驅動程式（64 位元）。請先安裝 psqlODBC，見 CLAUDE-SETUP.md 第 2 步。'
        }
        $OdbcDriver = $found.Name
    } else {
        $OdbcDriver = 'PostgreSQL Unicode'
    }
}

if (-not $SqlConnectionString) {
    $SqlConnectionString = "Server=$SqlServer;Database=master;Integrated Security=True;TrustServerCertificate=True;"
}

$pgUser = "backup_reader.$ProjectRef"

$config = [ordered]@{
    supabase  = [ordered]@{
        host       = $PoolerHost
        port       = $PoolerPort
        database   = 'postgres'
        user       = $pgUser
        sslMode    = $SslMode
        odbcDriver = $OdbcDriver
    }
    sqlServer = [ordered]@{
        connectionString = $SqlConnectionString
        database         = $Database
    }
    snapshots = [ordered]@{
        folder   = (Join-Path $script:LocalDir 'snapshots')
        keepDays = $KeepDays
    }
}
$config | ConvertTo-Json -Depth 5 | Set-Content -Path $script:ConfigPath -Encoding UTF8
Write-Host "已寫入設定檔：$($script:ConfigPath)"

if ($KeepPassword -and (Test-Path $script:CredentialPath)) {
    Write-Host '沿用原本的密碼。'
    return
}

$password = New-RandomPassword
Save-PgPassword -UserName $pgUser -Password $password
Write-Host "已加密儲存密碼：$($script:CredentialPath)"

$template = Get-Content -Path (Join-Path $PSScriptRoot 'sql\supabase-backup-reader.sql') -Raw -Encoding UTF8
$setupSql = Join-Path $script:LocalDir 'supabase-setup.sql'
$template.Replace('{{PASSWORD}}', $password) | Set-Content -Path $setupSql -Encoding UTF8
Write-Host ''
Write-Host '下一步：打開下面這個檔案，把全部內容貼到 Supabase 的 SQL Editor 執行。' -ForegroundColor Yellow
Write-Host "  $setupSql" -ForegroundColor Yellow
Write-Host '（檔案裡有密碼，貼完之後可以刪掉。）'
