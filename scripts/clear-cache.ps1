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
    Write-Host "Successfully .next directory cleared" -ForegroundColor Green
} else {
    Write-Host "✓ .next directory doesn't exist" -ForegroundColor Green
}

# Clear node_modules/.cache if it exists
if (Test-Path "node_modules\.cache") {
    Write-Host "Removing node_modules/.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ node_modules/.cache cleared" -ForegroundColor Green
}

# Clear Next.js cache directory (specifically)
if (Test-Path ".next\cache") {
    Write-Host "Removing Next.js cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next\cache" -ErrorAction SilentlyContinue
}

# End of script
Write-Host "`n✓ Cache cleared successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Clear your browser cache" -ForegroundColor White
Write-Host "2. Restart the dev server: npm run dev" -ForegroundColor White
