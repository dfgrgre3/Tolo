#!/usr/bin/env powershell

# Script to unify database imports across the codebase
# This script replaces all @/lib/db and @/lib/prisma imports with @/lib/db-unified

Write-Host "Starting database import unification..." -ForegroundColor Green

# Get all files that need updating by searching for both patterns
$allFiles = @()

# Find files with @/lib/db imports (excluding @/lib/db-unified)
$dbFiles = Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse | 
    Select-String -SimpleMatch "from '@/lib/db'" | 
    Where-Object { $_.Line -notmatch "from '@/lib/db-unified'" } |
    ForEach-Object { $_.Path } | 
    Get-Unique

# Find files with @/lib/prisma imports
$prismaFiles = Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse | 
    Select-String -SimpleMatch "from '@/lib/prisma'" | 
    ForEach-Object { $_.Path } | 
    Get-Unique

# Combine all files that need updating
$allFiles = $dbFiles + $prismaFiles | Get-Unique

Write-Host "Found $($allFiles.Count) files to update" -ForegroundColor Yellow

$updatedCount = 0
$errorCount = 0

foreach ($file in $allFiles) {
    try {
        $content = Get-Content -Path $file -Raw
        
        # Replace @/lib/db imports (but not @/lib/db-unified)
        $content = $content -replace "from '@/lib/db'", "from '@/lib/db-unified'"
        
        # Replace @/lib/prisma imports
        $content = $content -replace "from '@/lib/prisma'", "from '@/lib/db-unified'"
        
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Updated: $file" -ForegroundColor Cyan
        $updatedCount++
    }
    catch {
        Write-Host "Error updating $file`: $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`nDatabase import unification completed!" -ForegroundColor Green
Write-Host "Files updated: $updatedCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })

if ($errorCount -eq 0) {
    Write-Host "All database imports have been successfully unified to use @/lib/db-unified" -ForegroundColor Green
} else {
    Write-Host "Some files could not be updated. Please check the errors above." -ForegroundColor Red
}
