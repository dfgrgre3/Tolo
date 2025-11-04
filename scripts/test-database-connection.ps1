# PowerShell script to test database connection with nice formatting
# Usage: .\scripts\test-database-connection.ps1 [action]

param(
    [string]$Action = "diagnose"
)

$baseUrl = "http://localhost:3000/api/db/connection"

Write-Host ""
Write-Host "=== اختبار الاتصال بقاعدة البيانات ===" -ForegroundColor Cyan
Write-Host ""

try {
    $url = if ($Action) { "$baseUrl?action=$Action" } else { $baseUrl }
    
    Write-Host "جارٍ الاتصال بـ: $url" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
    $json = $response.Content | ConvertFrom-Json
    
    if ($json.success) {
        Write-Host "✓ الطلب نجح" -ForegroundColor Green
        Write-Host ""
        
        if ($json.diagnostics) {
            # Diagnose action
            Write-Host "📊 نتائج التشخيص:" -ForegroundColor Cyan
            Write-Host "─────────────────────────────────────" -ForegroundColor Gray
            
            Write-Host "حالة الاتصال: " -NoNewline
            if ($json.diagnostics.isConnected) {
                Write-Host "✓ متصل" -ForegroundColor Green
            } else {
                Write-Host "✗ غير متصل" -ForegroundColor Red
            }
            
            Write-Host "نوع قاعدة البيانات: " -NoNewline
            Write-Host $json.diagnostics.databaseType -ForegroundColor Yellow
            
            Write-Host "مسار قاعدة البيانات: " -NoNewline
            Write-Host $json.diagnostics.databaseUrl -ForegroundColor Yellow
            
            if ($json.diagnostics.recommendations -and $json.diagnostics.recommendations.Count -gt 0) {
                Write-Host ""
                Write-Host "💡 التوصيات:" -ForegroundColor Cyan
                foreach ($rec in $json.diagnostics.recommendations) {
                    Write-Host "  • $rec" -ForegroundColor White
                }
            }
            
            if ($json.diagnostics.error) {
                Write-Host ""
                Write-Host "❌ الأخطاء:" -ForegroundColor Red
                Write-Host "  $($json.diagnostics.error)" -ForegroundColor Red
            }
        }
        elseif ($json.status) {
            # Status action
            Write-Host "📊 حالة الاتصال:" -ForegroundColor Cyan
            Write-Host "─────────────────────────────────────" -ForegroundColor Gray
            
            Write-Host "متصل: " -NoNewline
            if ($json.status.connected) {
                Write-Host "✓ نعم" -ForegroundColor Green
            } else {
                Write-Host "✗ لا" -ForegroundColor Red
            }
            
            Write-Host "نوع قاعدة البيانات: " -NoNewline
            Write-Host $json.status.databaseType -ForegroundColor Yellow
            
            if ($json.status.error) {
                Write-Host ""
                Write-Host "❌ خطأ: " -ForegroundColor Red
                Write-Host "  $($json.status.error)" -ForegroundColor Red
            }
        }
        elseif ($json.message) {
            # Test or Initialize action
            Write-Host "📋 النتيجة:" -ForegroundColor Cyan
            Write-Host "─────────────────────────────────────" -ForegroundColor Gray
            Write-Host $json.message -ForegroundColor $(if ($json.success) { "Green" } else { "Red" })
        }
    } else {
        Write-Host "✗ الطلب فشل" -ForegroundColor Red
        if ($json.error) {
            Write-Host "خطأ: $($json.error)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "─────────────────────────────────────" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "✗ حدث خطأ أثناء الاتصال" -ForegroundColor Red
    Write-Host ""
    Write-Host "التفاصيل:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    Write-Host "التحقق من:" -ForegroundColor Yellow
    Write-Host "  1. هل الخادم يعمل؟ (npm run dev)" -ForegroundColor White
    Write-Host "  2. هل الرابط صحيح؟ ($baseUrl)" -ForegroundColor White
    Write-Host ""
}

Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  .\scripts\test-database-connection.ps1 diagnose    - Full diagnosis" -ForegroundColor White
Write-Host "  .\scripts\test-database-connection.ps1 test         - Test connection" -ForegroundColor White
Write-Host "  .\scripts\test-database-connection.ps1 initialize   - Initialize connection" -ForegroundColor White
Write-Host "  .\scripts\test-database-connection.ps1              - Current status" -ForegroundColor White
Write-Host ""

