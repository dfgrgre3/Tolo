# Script to fix Prisma EPERM errors on Windows
# This script stops Node processes and cleans Prisma cache before generating

Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Cleaning Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Generating Prisma Client..." -ForegroundColor Green
npx prisma generate

Write-Host "Done!" -ForegroundColor Green

