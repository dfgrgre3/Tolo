
Write-Host "Starting deep cleanup and dependency fix for pnpm..." -ForegroundColor Cyan

# 1. Kill any node processes that might be locking files
Write-Host "Killing Node.js and Next.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Force remove node_modules and .next
$dirsToRemove = @("node_modules", ".next")
foreach ($dir in $dirsToRemove) {
    if (Test-Path $dir) {
        Write-Host "Removing $dir (this may take a moment)..." -ForegroundColor Yellow
        # Using cmd /c rd /s /q is much faster and more reliable on Windows
        cmd /c "rd /s /q $dir"
    }
}

# 3. Clean pnpm store and cache
Write-Host "Pruning pnpm store..." -ForegroundColor Yellow
pnpm store prune

# 4. Reinstall dependencies
Write-Host "Installing dependencies with pnpm..." -ForegroundColor Green
pnpm install

Write-Host "`nCleanup and installation finished!" -ForegroundColor Cyan
