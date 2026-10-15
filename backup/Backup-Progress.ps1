<#
.SYNOPSIS
    把 Supabase 上的學習進度備份到本機：存一份 JSON 快照，並寫進 SQL Server。

.DESCRIPTION
    1. 用唯讀帳號 backup_reader 讀取 Supabase 的 backup.progress_with_email
    2. 存成 local\snapshots\progress-yyyyMMdd-HHmmss.json
    3. 寫進 SQL Server：dbo.Progress 放最新一份；進度有變化時在 dbo.ProgressHistory 多留一筆
    4. 刪掉超過保留天數的 JSON 快照
    結果記在 local\logs\backup-yyyyMM.log。失敗時結束代碼為 1（工作排程器會顯示失敗）。
#>
. (Join-Path $PSScriptRoot 'BackupCommon.ps1')

try {
    $config = Get-BackupConfig

    # 1. 讀 Supabase
    $rows = @()
    $pg = Open-PgConnection -Config $config
    try {
        $cmd = $pg.CreateCommand()
        $cmd.CommandText = @'
select user_id::text as user_id,
       email,
       data::text as data,
       to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
from backup.progress_with_email
order by updated_at
'@
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            $email = $null
            if (-not $reader.IsDBNull(1)) { $email = $reader.GetString(1) }
            $rows += [pscustomobject]@{
                user_id    = $reader.GetString(0)
                email      = $email
                data       = $reader.GetString(2)
                updated_at = $reader.GetString(3)
            }
        }
        $reader.Close()
    } finally {
        $pg.Dispose()
    }

    # 2. JSON 快照（data 存成物件，方便直接打開看）
    $folder = $config.snapshots.folder
    if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }
    $snapshot = [ordered]@{
        backedUpAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        count      = $rows.Count
        rows       = @($rows | ForEach-Object {
                [ordered]@{
                    user_id    = $_.user_id
                    email      = $_.email
                    updated_at = $_.updated_at
                    data       = ($_.data | ConvertFrom-Json)
                }
            })
    }
    $snapshotPath = Join-Path $folder ('progress-{0}.json' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    $snapshot | ConvertTo-Json -Depth 10 | Set-Content -Path $snapshotPath -Encoding UTF8

    # 3. 寫進 SQL Server（同一個交易，失敗就全部不寫）
    $changed = 0
    $sql = Open-SqlConnection -Config $config -Database $config.sqlServer.database
    try {
        $tx = $sql.BeginTransaction()
        foreach ($row in $rows) {
            $cmd = $sql.CreateCommand()
            $cmd.Transaction = $tx
            $cmd.CommandText = @'
DECLARE @prev datetimeoffset(3) = (SELECT UpdatedAt FROM dbo.Progress WHERE UserId = @UserId);
IF @prev IS NULL OR @prev <> @UpdatedAt
BEGIN
    INSERT dbo.ProgressHistory (UserId, Email, Data, UpdatedAt) VALUES (@UserId, @Email, @Data, @UpdatedAt);
    SELECT 1;
END
ELSE
    SELECT 0;

MERGE dbo.Progress AS t
USING (SELECT @UserId AS UserId) AS s ON t.UserId = s.UserId
WHEN MATCHED THEN
    UPDATE SET Email = @Email, Data = @Data, UpdatedAt = @UpdatedAt, BackedUpAt = SYSDATETIMEOFFSET()
WHEN NOT MATCHED THEN
    INSERT (UserId, Email, Data, UpdatedAt) VALUES (@UserId, @Email, @Data, @UpdatedAt);
'@
            [void]$cmd.Parameters.Add('@UserId', [System.Data.SqlDbType]::UniqueIdentifier)
            [void]$cmd.Parameters.Add('@Email', [System.Data.SqlDbType]::NVarChar, 320)
            [void]$cmd.Parameters.Add('@Data', [System.Data.SqlDbType]::NVarChar, -1)
            [void]$cmd.Parameters.Add('@UpdatedAt', [System.Data.SqlDbType]::DateTimeOffset)
            $cmd.Parameters['@UserId'].Value = [guid]$row.user_id
            if ($null -eq $row.email) { $cmd.Parameters['@Email'].Value = [DBNull]::Value } else { $cmd.Parameters['@Email'].Value = $row.email }
            $cmd.Parameters['@Data'].Value = $row.data
            $cmd.Parameters['@UpdatedAt'].Value = [DateTimeOffset]::Parse($row.updated_at, [Globalization.CultureInfo]::InvariantCulture)
            $changed += [int]$cmd.ExecuteScalar()
        }
        $tx.Commit()
    } catch {
        if ($tx) { $tx.Rollback() }
        throw
    } finally {
        $sql.Dispose()
    }

    # 4. 清掉舊的快照
    $keepDays = [int]$config.snapshots.keepDays
    if ($keepDays -gt 0) {
        $limit = (Get-Date).AddDays(-$keepDays)
        Get-ChildItem -Path $folder -Filter 'progress-*.json' |
            Where-Object { $_.LastWriteTime -lt $limit } |
            Remove-Item -Force
    }

    Write-BackupLog ('備份完成：{0} 個帳號，{1} 個有新進度，快照 {2}' -f $rows.Count, $changed, (Split-Path $snapshotPath -Leaf))
    exit 0
} catch {
    Write-BackupLog ('備份失敗：{0}' -f $_.Exception.Message) 'ERROR'
    exit 1
}
