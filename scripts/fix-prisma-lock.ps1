# Script to fix Prisma EPERM errors on Windows
# سكربت لإصلاح أخطاء EPERM الخاصة بـ Prisma على Windows
# This script stops Node processes and cleans Prisma cache before generating
#
# Usage:
#   npm run fix:prisma
#   powershell -ExecutionPolicy Bypass -File ./scripts/fix-prisma-lock.ps1
#   powershell -ExecutionPolicy Bypass -File ./scripts/fix-prisma-lock.ps1 -Build
#
# See ENVIRONMENT_ISSUES.md for more information about Windows EPERM issues

param(
    [switch]$Build  # If set, runs npm run build after generating Prisma Client
)

Write-Host "`n=== Fixing Prisma EPERM Error ===" -ForegroundColor Cyan

# Step 1: Stop Node.js processes
Write-Host "`n[1/5] Stopping Node.js processes..." -ForegroundColor Yellow

# Stop all Node processes
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"} -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    Write-Host "   Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "   No Node.js processes found" -ForegroundColor Gray
}

# Also check for npm/node processes that might lock files
$npmProcesses = Get-Process | Where-Object {$_.ProcessName -eq "npm" -or $_.ProcessName -like "*node*"} -ErrorAction SilentlyContinue
if ($npmProcesses) {
    $npmProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    Write-Host "   Stopped additional npm/node processes" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# Step 2: Clean Prisma cache
Write-Host "`n[2/5] Cleaning Prisma cache..." -ForegroundColor Yellow

# First, try to remove temporary DLL files specifically
$prismaClientPath = "node_modules\.prisma\client"
if (Test-Path $prismaClientPath) {
    Write-Host "   Removing temporary DLL files..." -ForegroundColor Yellow
    $tempFiles = Get-ChildItem -Path $prismaClientPath -Filter "*.tmp*" -ErrorAction SilentlyContinue
    if ($tempFiles) {
        foreach ($file in $tempFiles) {
            try {
                # Unlock file if possible
                $file.FullName | ForEach-Object {
                    $handle = [System.IO.File]::Open($_, 'Open', 'ReadWrite', 'None')
                    $handle.Close()
                } -ErrorAction SilentlyContinue
                Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
                Write-Host "   Removed: $($file.Name)" -ForegroundColor Gray
            } catch {
                Write-Host "   Could not remove: $($file.Name) (may be locked)" -ForegroundColor Yellow
            }
        }
    }
}

$prismaPath = "node_modules\.prisma"
if (Test-Path $prismaPath) {
    # Try multiple times with delays to handle locked files
    $maxAttempts = 5
    $attempt = 0
    $success = $false
    
    while ($attempt -lt $maxAttempts -and -not $success) {
        try {
            # Try to unlock files first
            Get-ChildItem -Path $prismaPath -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
                try {
                    $fileStream = [System.IO.File]::Open($_.FullName, 'Open', 'ReadWrite', 'None')
                    $fileStream.Close()
                } catch {
                    # File is locked, skip
                }
            }
            
            Remove-Item $prismaPath -Recurse -Force -ErrorAction Stop
            $success = $true
            Write-Host "   Prisma cache cleaned successfully" -ForegroundColor Green
        } catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Host "   Attempt $attempt failed, waiting longer..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "   Warning: Could not fully clean Prisma cache after $maxAttempts attempts" -ForegroundColor Yellow
                Write-Host "   Trying to remove individual files..." -ForegroundColor Yellow
                # Last resort: try to remove files individually
                try {
                    Get-ChildItem -Path $prismaPath -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                } catch {
                    Write-Host "   Some files may still be locked. Please close all Node processes and try again." -ForegroundColor Red
                }
            }
        }
    }
} else {
    Write-Host "   Prisma cache not found (already clean)" -ForegroundColor Gray
}

# Clean Prisma generated client cache
$prismaClientPath = "node_modules\@prisma\client"
if (Test-Path "$prismaClientPath\.prisma") {
    Remove-Item "$prismaClientPath\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Prisma client cache cleaned" -ForegroundColor Green
}

# Step 3: Verify Prisma schema
Write-Host "`n[3/5] Verifying Prisma schema..." -ForegroundColor Yellow

if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "   Error: prisma\schema.prisma not found!" -ForegroundColor Red
    exit 1
}
Write-Host "   Prisma schema found" -ForegroundColor Green

# Step 4: Generate Prisma Client
Write-Host "`n[4/5] Generating Prisma Client..." -ForegroundColor Yellow

$env:PRISMA_GENERATE_SKIP_AUTOINSTALL = "true"
npx prisma generate --schema=./prisma/schema.prisma

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Prisma Client generated successfully" -ForegroundColor Green
} else {
    Write-Host "   Error generating Prisma Client (exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "   Tip: Make sure all Node processes are stopped and try again" -ForegroundColor Yellow
    exit 1
}

# Step 5: Build (if requested)
if ($Build) {
    Write-Host "`n[5/5] Building Next.js application..." -ForegroundColor Yellow
    
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] Build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] Build failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[5/5] Skipping build (use -Build flag to build)" -ForegroundColor Gray
}

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "`nTips:" -ForegroundColor Cyan
Write-Host "   - If EPERM errors persist, run PowerShell as Administrator" -ForegroundColor Gray
Write-Host "   - Make sure no other processes are accessing node_modules\.prisma" -ForegroundColor Gray
