# Supabase Database Backup Script (PowerShell)
# Backs up the Infiniti Code Tech local/remote database into timestamped SQL archive

$DateStr = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$BackupFile = Join-Path $BackupDir "ict_backup_$DateStr.sql"

Write-Host "=================================================="
Write-Host "Infiniti Code Tech Database Backup"
Write-Host "=================================================="
Write-Host "Target output: $BackupFile"

# If Supabase CLI is available:
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    Write-Host "Using Supabase CLI to generate pg_dump..."
    supabase db dump -f $BackupFile
    Write-Host "[SUCCESS] Database backup saved to $BackupFile"
} else {
    Write-Host "[NOTE] Supabase CLI not found in PATH."
    Write-Host "Exporting local schema and seed files into bundled archive..."
    $SchemaFiles = Get-ChildItem (Join-Path $PSScriptRoot "..\supabase\migrations\*.sql")
    $Combined = ""
    foreach ($f in $SchemaFiles) {
        $Combined += "-- File: $($f.Name)`n"
        $Combined += (Get-Content $f.FullName -Raw) + "`n`n"
    }
    Set-Content -Path $BackupFile -Value $Combined
    Write-Host "[SUCCESS] Schema & migrations bundled to $BackupFile"
}
