# Script to clean .env file from NextAuth variables
# Script to remove NEXTAUTH_SECRET and NEXTAUTH_URL from .env file

$envPath = ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "File .env not found. Nothing to clean." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "=== Cleaning .env file from NextAuth variables ===" -ForegroundColor Cyan
Write-Host ""

# Read current content line by line
$lines = Get-Content $envPath
$originalLines = $lines

# Filter out lines containing NEXTAUTH_SECRET or NEXTAUTH_URL
$filteredLines = @()
foreach ($line in $lines) {
    $trimmedLine = $line.Trim()
    # Skip lines that contain NEXTAUTH_SECRET or NEXTAUTH_URL (even in comments)
    if ($trimmedLine -notmatch 'NEXTAUTH_SECRET' -and $trimmedLine -notmatch 'NEXTAUTH_URL') {
        $filteredLines += $line
    }
}

# Clean up multiple empty lines (replace 3+ consecutive empty lines with 2)
$cleanedLines = @()
$emptyCount = 0
foreach ($line in $filteredLines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
        $emptyCount++
        if ($emptyCount -le 2) {
            $cleanedLines += $line
        }
    } else {
        $emptyCount = 0
        $cleanedLines += $line
    }
}

# Join lines back
$content = $cleanedLines -join "`r`n"
$originalContent = $originalLines -join "`r`n"

# Trim trailing whitespace
$content = $content.TrimEnd()

# Check if anything changed
$removedVariables = @()
if ($originalLines.Count -gt $filteredLines.Count) {
    foreach ($line in $originalLines) {
        $trimmedLine = $line.Trim()
        if ($trimmedLine -match 'NEXTAUTH_SECRET') {
            $removedVariables += "NEXTAUTH_SECRET"
        }
        if ($trimmedLine -match 'NEXTAUTH_URL') {
            $removedVariables += "NEXTAUTH_URL"
        }
    }
}

if ($content -eq $originalContent) {
    Write-Host "[SUCCESS] No NextAuth variables found in .env file" -ForegroundColor Green
} else {
    # Backup original file
    $backupPath = ".env.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $envPath $backupPath -Force
    Write-Host "[INFO] Created backup: $backupPath" -ForegroundColor Gray
    
    # Write cleaned content
    Set-Content -Path $envPath -Value $content -NoNewline
    
    Write-Host "[SUCCESS] Cleaned .env file from NextAuth variables" -ForegroundColor Green
    if ($removedVariables.Count -gt 0) {
        Write-Host ""
        Write-Host "Removed variables:" -ForegroundColor Yellow
        $removedVariables | Sort-Object -Unique | ForEach-Object {
            Write-Host "  - $_" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "[TIP] Make sure JWT_SECRET is set in your .env file" -ForegroundColor Cyan
Write-Host ""

