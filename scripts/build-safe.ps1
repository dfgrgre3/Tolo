# Safe build script that handles Prisma EPERM errors
param()

Write-Host "`n=== Safe Build Process ===" -ForegroundColor Cyan

# Stop Node processes
Write-Host "`n[1/3] Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Clean Prisma cache and .next
Write-Host "`n[2/3] Cleaning caches..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
}

# Retry .next deletion up to 3 times (Windows file handles need time to release)
if (Test-Path ".next") {
    $retries = 3
    for ($i = 1; $i -le $retries; $i++) {
        Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path ".next")) {
            Write-Host "  .next directory cleaned successfully" -ForegroundColor Green
            break
        }
        Write-Host "  .next deletion attempt $i/$retries failed, retrying..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    if (Test-Path ".next") {
        Write-Host "  WARNING: Could not fully delete .next - stale types may cause errors" -ForegroundColor Red
    }
}

# Generate and build
Write-Host "`n[3/3] Generating Prisma and building..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma generate failed!" -ForegroundColor Red
    exit 1
}

npx next build --webpack
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[SUCCESS] Build completed!" -ForegroundColor Green

