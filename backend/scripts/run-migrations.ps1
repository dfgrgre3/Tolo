#!/usr/bin/env pwsh
# Run Database Migrations for Thanawy Backend
# This script applies SQL migrations to fix missing tables and columns

param(
    [switch]$DryRun,
    [switch]$Force,
    [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Status($message, $color = $Blue) {
    Write-Host "$color[Thanawy Migrations]$Reset $message"
}

function Write-Success($message) {
    Write-Status $message $Green
}

function Write-Error($message) {
    Write-Status $message $Red
}

function Write-Warning($message) {
    Write-Status $message $Yellow
}

# Check if psql is available
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Error "PostgreSQL client (psql) not found in PATH"
    Write-Status "Please install PostgreSQL and ensure psql is in your PATH"
    exit 1
}

# Parse DATABASE_URL if provided
if (-not $DatabaseUrl) {
    # Try to load from .env file
    $envFile = Join-Path $PSScriptRoot ".." ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^DATABASE_URL=(.*)$') {
                $DatabaseUrl = $matches[1]
            }
        }
    }
}

if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL not provided and not found in .env file"
    Write-Status "Usage: .\run-migrations.ps1 -DatabaseUrl 'postgresql://...'"
    exit 1
}

Write-Status "Connecting to database..."
Write-Status "Database URL: $($DatabaseUrl -replace '://.*@', '://***@')"

# Extract connection details from URL
# Format: postgresql://user:pass@host:port/dbname?sslmode=...
if ($DatabaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?]+)') {
    $env:PGUSER = $matches[1]
    $env:PGPASSWORD = $matches[2]
    $env:PGHOST = $matches[3]
    $env:PGPORT = if ($matches[4]) { $matches[4] } else { "5432" }
    $env:PGDATABASE = $matches[5]
} else {
    Write-Error "Invalid DATABASE_URL format"
    exit 1
}

Write-Status "Host: $env:PGHOST, Port: $env:PGPORT, Database: $env:PGDATABASE"

# Test connection
Write-Status "Testing database connection..."
$testResult = psql -c "SELECT 1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to connect to database"
    Write-Error $testResult
    exit 1
}
Write-Success "Database connection successful"

# Get migration files
$migrationsDir = Join-Path $PSScriptRoot ".." "internal" "db" "migrations"
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

Write-Status "Found $($migrationFiles.Count) migration files"

# Create schema_migrations table if not exists
$createMigrationsTable = @"
CREATE TABLE IF NOT EXISTS "schema_migrations" (
    id text PRIMARY KEY,
    checksum text NOT NULL,
    "appliedAt" timestamptz NOT NULL DEFAULT now()
);
"@

if (-not $DryRun) {
    psql -c $createMigrationsTable 2>&1 | Out-Null
    Write-Success "schema_migrations table ready"
}

# Apply each migration
foreach ($file in $migrationFiles) {
    $migrationId = $file.BaseName
    
    # Check if migration already applied
    $checkQuery = "SELECT 1 FROM \"schema_migrations\" WHERE id = '$migrationId'"
    $exists = psql -t -c $checkQuery 2>&1 | ForEach-Object { $_.Trim() } | Where-Object { $_ -eq "1" }
    
    if ($exists -and -not $Force) {
        Write-Warning "Skipping $migrationId (already applied)"
        continue
    }
    
    if ($exists -and $Force) {
        Write-Warning "Reapplying $migrationId (forced)"
    }
    
    Write-Status "Applying $migrationId..."
    
    if ($DryRun) {
        Write-Status "[DRY RUN] Would apply: $($file.FullName)"
        continue
    }
    
    # Calculate checksum
    $content = Get-Content $file.FullName -Raw
    $checksum = [System.BitConverter]::ToString(
        [System.Security.Cryptography.SHA256]::Create().ComputeHash(
            [System.Text.Encoding]::UTF8.GetBytes($content)
        )
    ).Replace("-", "").ToLower()
    
    # Apply migration
    $result = psql -f $file.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Migration $migrationId failed"
        Write-Error $result
        exit 1
    }
    
    # Record migration
    $insertQuery = @"
INSERT INTO "schema_migrations" (id, checksum, "appliedAt")
VALUES ('$migrationId', '$checksum', now())
ON CONFLICT (id) DO UPDATE SET
    checksum = EXCLUDED.checksum,
    "appliedAt" = now();
"@
    psql -c $insertQuery 2>&1 | Out-Null
    
    Write-Success "Applied $migrationId"
}

# Verify critical tables
Write-Status "Verifying database schema..."
$verifyTables = @(
    "User",
    "SystemSetting",
    "AuditLog",
    "SecurityLog"
)

$allOk = $true
foreach ($table in $verifyTables) {
    $checkQuery = "SELECT 1 FROM information_schema.tables WHERE table_name = '$table'"
    $exists = psql -t -c $checkQuery 2>&1 | ForEach-Object { $_.Trim() } | Where-Object { $_ -eq "1" }
    
    if ($exists) {
        Write-Success "✓ Table $table exists"
    } else {
        Write-Error "✗ Table $table is missing"
        $allOk = $false
    }
}

# Verify critical columns
Write-Status "Verifying critical columns..."
$verifyColumns = @(
    @{ Table = "User"; Column = "deleted_at" },
    @{ Table = "SecurityLog"; Column = "user_id" }
)

foreach ($col in $verifyColumns) {
    $checkQuery = "SELECT 1 FROM information_schema.columns WHERE table_name = '$($col.Table)' AND column_name = '$($col.Column)'"
    $exists = psql -t -c $checkQuery 2>&1 | ForEach-Object { $_.Trim() } | Where-Object { $_ -eq "1" }
    
    if ($exists) {
        Write-Success "✓ Column $($col.Table).$($col.Column) exists"
    } else {
        Write-Error "✗ Column $($col.Table).$($col.Column) is missing"
        $allOk = $false
    }
}

if ($allOk) {
    Write-Success "All migrations completed successfully!"
    exit 0
} else {
    Write-Error "Some schema issues remain. Please check the errors above."
    exit 1
}
