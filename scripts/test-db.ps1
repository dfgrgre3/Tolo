# Test Database Connection Script
# Usage: .\scripts\test-db.ps1 [diagnose|test|initialize]

param(
    [Parameter(Position=0)]
    [string]$Action = "diagnose"
)

$baseUrl = "http://localhost:3000/api/db/connection"

Write-Host ""
Write-Host "=== Database Connection Test ===" -ForegroundColor Cyan
Write-Host ""

try {
    if ($Action -and $Action.Trim() -ne "") {
        $url = "$baseUrl`?action=$Action"
    } else {
        $url = $baseUrl
    }
    
    Write-Host "Connecting to: $url" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
    $json = $response.Content | ConvertFrom-Json
    
    if ($json.success) {
        Write-Host "[OK] Request successful" -ForegroundColor Green
        Write-Host ""
        
        if ($json.diagnostics) {
            Write-Host "Diagnostics Results:" -ForegroundColor Cyan
            Write-Host "----------------------------------------" -ForegroundColor Gray
            
            Write-Host "Connected: " -NoNewline
            if ($json.diagnostics.isConnected) {
                Write-Host "[OK] Yes" -ForegroundColor Green
            } else {
                Write-Host "[FAIL] No" -ForegroundColor Red
            }
            
            Write-Host "Database Type: " -NoNewline
            Write-Host $json.diagnostics.databaseType -ForegroundColor Yellow
            
            Write-Host "Database URL: " -NoNewline
            Write-Host $json.diagnostics.databaseUrl -ForegroundColor Yellow
            
            if ($json.diagnostics.recommendations -and $json.diagnostics.recommendations.Count -gt 0) {
                Write-Host ""
                Write-Host "Recommendations:" -ForegroundColor Cyan
                foreach ($rec in $json.diagnostics.recommendations) {
                    Write-Host "  - $rec" -ForegroundColor White
                }
            }
            
            if ($json.diagnostics.error) {
                Write-Host ""
                Write-Host "Errors:" -ForegroundColor Red
                Write-Host "  $($json.diagnostics.error)" -ForegroundColor Red
            }
        }
        elseif ($json.status) {
            Write-Host "Connection Status:" -ForegroundColor Cyan
            Write-Host "----------------------------------------" -ForegroundColor Gray
            
            Write-Host "Connected: " -NoNewline
            if ($json.status.connected) {
                Write-Host "[OK] Yes" -ForegroundColor Green
            } else {
                Write-Host "[FAIL] No" -ForegroundColor Red
            }
            
            Write-Host "Database Type: " -NoNewline
            Write-Host $json.status.databaseType -ForegroundColor Yellow
            
            if ($json.status.error) {
                Write-Host ""
                Write-Host "Error: " -ForegroundColor Red
                Write-Host "  $($json.status.error)" -ForegroundColor Red
            }
        }
        elseif ($json.message) {
            Write-Host "Result:" -ForegroundColor Cyan
            Write-Host "----------------------------------------" -ForegroundColor Gray
            $color = if ($json.success) { "Green" } else { "Red" }
            Write-Host $json.message -ForegroundColor $color
        }
    } else {
        Write-Host "[FAIL] Request failed" -ForegroundColor Red
        if ($json.error) {
            Write-Host "Error: $($json.error)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "[FAIL] Connection error" -ForegroundColor Red
    Write-Host ""
    Write-Host "Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    Write-Host "Check:" -ForegroundColor Yellow
    Write-Host "  1. Is the server running? (npm run dev)" -ForegroundColor White
    Write-Host "  2. Is the URL correct? ($baseUrl)" -ForegroundColor White
    Write-Host ""
}

Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  .\scripts\test-db.ps1 diagnose    - Full diagnosis" -ForegroundColor White
Write-Host "  .\scripts\test-db.ps1 test         - Test connection" -ForegroundColor White
Write-Host "  .\scripts\test-db.ps1 initialize   - Initialize connection" -ForegroundColor White
Write-Host "  .\scripts\test-db.ps1              - Current status" -ForegroundColor White
Write-Host ""

