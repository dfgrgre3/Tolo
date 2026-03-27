# Project Structural Optimization Script
# Purpose: Reorganize the project based on the Technical Audit findings.

Write-Host "Starting Project Structure Refactoring..." -ForegroundColor Cyan

# 1. Dashboard Reorganization
# Moves current dashboard to a consolidated /dashboard route and fixes redundancy.
if (Test-Path "src/app/(dashboard)") {
    Write-Host "Consolidating Dashboard Group..." -ForegroundColor Yellow
    
    # Create the new dashboard root path
    if (!(Test-Path "src/app/dashboard")) {
        New-Item -ItemType Directory -Path "src/app/dashboard" -Force | Out-Null
    }

    # Move content from (dashboard)/dashboard to dashboard/
    Move-Item -Path "src/app/(dashboard)/*" -Destination "src/app/dashboard/" -Force
    
    # Move the main page up from dashboard/dashboard/page.tsx to dashboard/page.tsx
    if (Test-Path "src/app/dashboard/dashboard/page.tsx") {
        Move-Item -Path "src/app/dashboard/dashboard/page.tsx" -Destination "src/app/dashboard/page.tsx" -Force
        if (Test-Path "src/app/dashboard/dashboard/components") {
            Move-Item -Path "src/app/dashboard/dashboard/components" -Destination "src/app/dashboard/components" -Force
        }
        Remove-Item "src/app/dashboard/dashboard" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Remove the (dashboard) route group
    Remove-Item "src/app/(dashboard)" -Recurse -Force -ErrorAction SilentlyContinue
}

# 2. API Modularization (Domain-based grouping)
Write-Host "Modularizing API Structure..." -ForegroundColor Yellow
$apiRoot = "src/app/api"
$v1Path = "src/app/api/v1"

# Create Domain Folders
$domains = @("auth", "edu", "community", "productivity", "biz", "ops", "admin")
foreach ($domain in $domains) {
    if (!(Test-Path "$v1Path/$domain")) {
        New-Item -ItemType Directory -Path "$v1Path/$domain" -Force | Out-Null
    }
}

# Identity & Auth
$authApis = @("auth", "users", "sessions", "settings", "csrf")
foreach ($api in $authApis) {
    if (Test-Path "$apiRoot/$api") { Move-Item -Path "$apiRoot/$api" -Destination "$v1Path/auth/" -ErrorAction SilentlyContinue }
}

# Education
$eduApis = @("exams", "lessons", "subjects", "topics", "library", "courses", "tests", "evaluate-test", "generate-test")
foreach ($api in $eduApis) {
    if (Test-Path "$apiRoot/$api") { Move-Item -Path "$apiRoot/$api" -Destination "$v1Path/edu/" -ErrorAction SilentlyContinue }
}

# Productivity
$prodApis = @("tasks", "schedule", "reminders", "progress", "gamification", "achievements", "goals", "leaderboard")
foreach ($api in $prodApis) {
    if (Test-Path "$apiRoot/$api") { Move-Item -Path "$apiRoot/$api" -Destination "$v1Path/productivity/" -ErrorAction SilentlyContinue }
}

# System & Ops
$opsApis = @("healthz", "readyz", "metrics", "cron", "upload", "db-monitor", "logs")
foreach ($api in $opsApis) {
    if (Test-Path "$apiRoot/$api") { Move-Item -Path "$apiRoot/$api" -Destination "$v1Path/ops/" -ErrorAction SilentlyContinue }
}

# 3. Legacy Script Cleanup
Write-Host "Cleaning up root scripts..." -ForegroundColor Yellow
if (!(Test-Path "scripts/old")) {
    New-Item -ItemType Directory -Path "scripts/old" -Force | Out-Null
}

# Move legacy encoding/maintenance python scripts
$pyScripts = Get-ChildItem -Path "*.py"
foreach ($s in $pyScripts) {
    Move-Item -Path $s.FullName -Destination "scripts/old/" -Force
}

# Consolidate duplicate scripts
if (Test-Path "replace_db_imports.ps1") {
    Move-Item -Path "replace_db_imports.ps1" -Destination "scripts/replace-db-imports.ps1" -Force
}

Write-Host "`n✓ Structure optimization complete!" -ForegroundColor Green
Write-Host "Next Step: Run 'npm run build' to check for broken imports." -ForegroundColor Cyan
