# 一步一步學習日文：備份腳本共用的設定和函式（由其他腳本 dot-source 載入）
# 相容 Windows PowerShell 5.1 和 PowerShell 7。

$ErrorActionPreference = 'Stop'

$script:BackupRoot = $PSScriptRoot
$script:LocalDir = Join-Path $PSScriptRoot 'local'
$script:ConfigPath = Join-Path $script:LocalDir 'config.json'
$script:CredentialPath = Join-Path $script:LocalDir 'supabase-credential.xml'
$script:LogDir = Join-Path $script:LocalDir 'logs'

function Write-BackupLog {
    param([string]$Message, [string]$Level = 'INFO')
    if (-not (Test-Path $script:LogDir)) { New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null }
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    $logFile = Join-Path $script:LogDir ('backup-{0}.log' -f (Get-Date -Format 'yyyyMM'))
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    if ($Level -eq 'ERROR') { Write-Host $line -ForegroundColor Red } else { Write-Host $line }
}

function Get-BackupConfig {
    if (-not (Test-Path $script:ConfigPath)) {
        throw "找不到設定檔 $($script:ConfigPath)，請先執行 New-BackupConfig.ps1。"
    }
    return Get-Content -Path $script:ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

# Supabase 唯讀帳號的密碼：存在 local/supabase-credential.xml。
# Windows 上用 DPAPI 加密，只有同一台電腦、同一個 Windows 使用者解得開。
# 環境變數 BACKUP_PG_PASSWORD 有值時優先使用（測試用）。
function Get-PgPassword {
    if ($env:BACKUP_PG_PASSWORD) { return $env:BACKUP_PG_PASSWORD }
    if (-not (Test-Path $script:CredentialPath)) {
        throw "找不到密碼檔 $($script:CredentialPath)，請先執行 New-BackupConfig.ps1。"
    }
    $cred = Import-Clixml -Path $script:CredentialPath
    return $cred.GetNetworkCredential().Password
}

function Save-PgPassword {
    param([string]$UserName, [string]$Password)
    $secure = ConvertTo-SecureString -String $Password -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential($UserName, $secure)
    $cred | Export-Clixml -Path $script:CredentialPath -Force
}

function New-RandomPassword {
    param([int]$Length = 32)
    # 只用英數字，避免連線字串和 SQL 需要跳脫
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'.ToCharArray()
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Open-PgConnection {
    param($Config)
    $pg = $Config.supabase
    $cs = 'Driver={{{0}}};Server={1};Port={2};Database={3};Uid={4};Pwd={{{5}}};SSLMode={6};' -f `
        $pg.odbcDriver, $pg.host, $pg.port, $pg.database, $pg.user, (Get-PgPassword), $pg.sslMode
    $conn = New-Object System.Data.Odbc.OdbcConnection($cs)
    $conn.ConnectionTimeout = 30
    $conn.Open()
    return $conn
}

function Open-SqlConnection {
    param($Config, [string]$Database)
    $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder($Config.sqlServer.connectionString)
    if ($Database) { $builder['Initial Catalog'] = $Database }
    $conn = New-Object System.Data.SqlClient.SqlConnection($builder.ConnectionString)
    $conn.Open()
    return $conn
}
