# Update DATABASE_URL in .env file to PostgreSQL

$envPath = ".env"
$newDbUrl = "postgresql://postgres:password@localhost:5432/thanawy?schema=public"

if (-not (Test-Path $envPath)) {
    Write-Host ".env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Updating DATABASE_URL in .env..." -ForegroundColor Cyan

$lines = Get-Content $envPath
$updated = $false
$newLines = @()

foreach ($line in $lines) {
    if ($line -match '^\s*DATABASE_URL\s*=') {
        $newLines += "DATABASE_URL=`"$newDbUrl`""
        $updated = $true
        Write-Host "Updated: $line" -ForegroundColor Yellow
        Write-Host "To: DATABASE_URL=`"$newDbUrl`"" -ForegroundColor Green
    } else {
        $newLines += $line
    }
}

if (-not $updated) {
    Write-Host "DATABASE_URL not found, adding it..." -ForegroundColor Yellow
    $newLines += ""
    $newLines += "# Database Configuration"
    $newLines += "DATABASE_URL=`"$newDbUrl`""
}

$newLines -join "`n" | Set-Content $envPath -NoNewline

Write-Host ""
Write-Host "Done! DATABASE_URL updated to PostgreSQL" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Update the password if needed:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL=`"postgresql://postgres:YOUR_PASSWORD@localhost:5432/thanawy?schema=public`"" -ForegroundColor Gray
Write-Host ""

