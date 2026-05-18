param(
    [string]$BackupDir = "../backups",
    [string]$DbUrl = $env:DATABASE_URL,
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackupDir "thanawy_backup_$timestamp.sql"
$logPath = Join-Path $BackupDir "backup_log.txt"

Write-Output "[$timestamp] Starting database backup..." | Tee-Object $logPath -Append

if (-not $DbUrl) {
    Write-Error "DATABASE_URL environment variable is not set"
    exit 1
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
$uri = [System.Uri]$DbUrl
$dbName = $uri.AbsolutePath.TrimStart('/')
$hostPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$cred = $uri.UserInfo.Split(':')

$env:PGPASSWORD = $cred[1]

try {
    & pg_dump --host=$($uri.Host) --port=$hostPort --username=$cred[0] --dbname=$dbName `
        --format=custom --compress=9 --verbose `
        --file=$backupPath 2>&1 | Tee-Object $logPath -Append

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    # Encrypt backup (optional - requires GPG)
    # gpg --symmetric --cipher-algo AES256 --batch --passphrase $env:BACKUP_ENCRYPTION_KEY $backupPath

    # Upload to S3 (optional)
    # aws s3 cp $backupPath "s3://thanawy-backups/$timestamp.sql.gz" --storage-class STANDARD_IA

    $fileInfo = Get-Item $backupPath
    Write-Output "Backup completed: $backupPath ($([math]::Round($fileInfo.Length/1MB, 2)) MB)" | Tee-Object $logPath -Append

    # Cleanup old backups
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem $BackupDir -Filter "thanawy_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Output "Removed old backup: $($_.Name)" | Tee-Object $logPath -Append
    }

    # Create a symlink for latest backup
    $latestLink = Join-Path $BackupDir "latest_backup.sql"
    if (Test-Path $latestLink) { Remove-Item $latestLink -Force }
    New-Item -ItemType SymbolicLink -Path $latestLink -Target $backupPath -Force | Out-Null
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
