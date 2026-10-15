<#
.SYNOPSIS
    在 Windows 工作排程器建立每天自動備份的工作。

.EXAMPLE
    .\Register-BackupTask.ps1 -At 21:00

.NOTES
    用目前登入的 Windows 帳號執行（密碼檔只有這個帳號解得開），不需要系統管理員權限。
    電腦在排定時間是關機的話，下次開機登入後會補跑。
    要移除：Unregister-ScheduledTask -TaskName 'LearningJapanese-ProgressBackup'
#>
param(
    [string]$At = '21:00',
    [string]$TaskName = 'LearningJapanese-ProgressBackup'
)

$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'Backup-Progress.ps1'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $script) `
    -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Description '一步一步學習日文：每天把 Supabase 上的學習進度備份到本機 SQL Server' -Force | Out-Null

Write-Host "已建立排程工作「$TaskName」，每天 $At 執行。"
Write-Host "立刻試跑一次：Start-ScheduledTask -TaskName '$TaskName'"
