# Script to clear Next.js cache and restart dev server
# This helps fix chunk loading errors with Turbopack

Write-Host "Clearing Next.js cache and build artifacts..." -ForegroundColor Yellow

# Stop any running Next.js processes
Write-Host "Stopping Next.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*next*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear .next directory
if (Test-Path .next) {
    Write-Host "Removing .next directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next
    Write-Host "✓ .next directory cleared" -ForegroundColor Green
} else {
    Write-Host "✓ .next directory doesn't exist" -ForegroundColor Green
}

# Clear node_modules/.cache if it exists
if (Test-Path "node_modules\.cache") {
    Write-Host "Removing node_modules/.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ node_modules/.cache cleared" -ForegroundColor Green
}

# Clear Turbopack cache
$turbopackCache = "$env:TEMP\.turbo"
if (Test-Path $turbopackCache) {
    Write-Host "Removing Turbopack cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $turbopackCache -ErrorAction SilentlyContinue
    Write-Host "✓ Turbopack cache cleared" -ForegroundColor Green
}

# Clear webpack cache
if (Test-Path ".next\cache\webpack") {
    Write-Host "Removing webpack cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next\cache\webpack" -ErrorAction SilentlyContinue
    Write-Host "✓ Webpack cache cleared" -ForegroundColor Green
}

# Clear Next.js cache directory
if (Test-Path ".next\cache") {
    Write-Host "Removing Next.js cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next\cache" -ErrorAction SilentlyContinue
    Write-Host "✓ Next.js cache cleared" -ForegroundColor Green
}

# Clear browser cache suggestion
Write-Host "`n✓ Cache cleared successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Clear your browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "2. Restart the dev server: npm run dev" -ForegroundColor White
Write-Host "3. If the issue persists, try: npm run dev:no-turbo" -ForegroundColor White

