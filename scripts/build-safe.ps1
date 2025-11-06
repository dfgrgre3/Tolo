# Safe build script that handles Prisma EPERM errors
param()

Write-Host "`n=== Safe Build Process ===" -ForegroundColor Cyan

# Stop Node processes
Write-Host "`n[1/3] Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clean Prisma cache
Write-Host "`n[2/3] Cleaning Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
}

# Generate and build
Write-Host "`n[3/3] Generating Prisma and building..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma generate failed!" -ForegroundColor Red
    exit 1
}

npx next build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[SUCCESS] Build completed!" -ForegroundColor Green

