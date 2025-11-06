# Script to fix Prisma EPERM errors on Windows
# This script stops Node processes and cleans Prisma cache before generating

param(
    [switch]$Build
)

Write-Host "`n=== Fixing Prisma EPERM Error ===" -ForegroundColor Cyan

# Step 1: Stop Node.js processes
Write-Host "`n[1/4] Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"} -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Gray
} else {
    Write-Host "   No Node.js processes found" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# Step 2: Clean Prisma cache
Write-Host "`n[2/4] Cleaning Prisma cache..." -ForegroundColor Yellow
$prismaPath = "node_modules\.prisma"
if (Test-Path $prismaPath) {
    try {
        Remove-Item $prismaPath -Recurse -Force -ErrorAction Stop
        Write-Host "   Prisma cache cleaned successfully" -ForegroundColor Gray
    } catch {
        Write-Host "   Warning: Could not fully clean Prisma cache: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Prisma cache not found (already clean)" -ForegroundColor Gray
}

# Step 3: Generate Prisma Client
Write-Host "`n[3/4] Generating Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Prisma Client generated successfully" -ForegroundColor Green
    } else {
        Write-Host "   Error generating Prisma Client" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Build (if requested)
if ($Build) {
    Write-Host "`n[4/4] Building Next.js application..." -ForegroundColor Yellow
    try {
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n[SUCCESS] Build completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "`n[ERROR] Build failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "   Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[4/4] Skipping build (use -Build flag to build)" -ForegroundColor Gray
}

Write-Host "`n=== Done ===" -ForegroundColor Green

