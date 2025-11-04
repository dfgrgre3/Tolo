# PowerShell script to fix database connection issues
# This script helps resolve common Prisma and database connection problems on Windows

Write-Host "=== إصلاح مشاكل الاتصال بقاعدة البيانات ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
Write-Host "1. التحقق من ملف .env.local..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✓ ملف .env.local موجود" -ForegroundColor Green
    
    # Check if DATABASE_URL is set
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "DATABASE_URL") {
        Write-Host "   ✓ DATABASE_URL موجود" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ DATABASE_URL غير موجود في .env.local" -ForegroundColor Red
        Write-Host "   يرجى إضافة: DATABASE_URL=file:./prisma/dev.db" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ ملف .env.local غير موجود" -ForegroundColor Red
    Write-Host "   يرجى إنشاء الملف وإضافة DATABASE_URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. إيقاف العمليات التي قد تستخدم Prisma..." -ForegroundColor Yellow

# Kill any Node processes that might be using Prisma
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   وجدت عمليات Node.js قيد التشغيل" -ForegroundColor Yellow
    $response = Read-Host "   هل تريد إيقافها؟ (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   ✓ تم إيقاف عمليات Node.js" -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "   ✓ لا توجد عمليات Node.js قيد التشغيل" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. تنظيف ملفات Prisma القديمة..." -ForegroundColor Yellow

# Remove Prisma client cache
$prismaClientPath = "node_modules\.prisma"
if (Test-Path $prismaClientPath) {
    try {
        # Try to remove with force
        Remove-Item -Path $prismaClientPath -Recurse -Force -ErrorAction Stop
        Write-Host "   ✓ تم حذف ملفات Prisma Client القديمة" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠ لا يمكن حذف بعض الملفات (قد تكون قيد الاستخدام)" -ForegroundColor Yellow
        Write-Host "   قد تحتاج إلى إغلاق VS Code أو إعادة تشغيل الكمبيوتر" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✓ لا توجد ملفات Prisma Client القديمة" -ForegroundColor Green
}

Write-Host ""
Write-Host "4. توليد Prisma Client..." -ForegroundColor Yellow

# Generate Prisma Client
try {
    $generateOutput = npx prisma generate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ تم توليد Prisma Client بنجاح" -ForegroundColor Green
    } else {
        Write-Host "   ✗ فشل توليد Prisma Client" -ForegroundColor Red
        Write-Host "   الخطأ:" -ForegroundColor Red
        Write-Host $generateOutput -ForegroundColor Red
        
        # Check if it's an EPERM error
        if ($generateOutput -match "EPERM") {
            Write-Host ""
            Write-Host "   ⚠ خطأ EPERM - مشكلة في الصلاحيات" -ForegroundColor Yellow
            Write-Host "   الحلول المقترحة:" -ForegroundColor Yellow
            Write-Host "   1. أعد تشغيل Terminal بصلاحيات المسؤول" -ForegroundColor Yellow
            Write-Host "   2. أغلق VS Code وأعد المحاولة" -ForegroundColor Yellow
            Write-Host "   3. تحقق من إعدادات برنامج مكافحة الفيروسات" -ForegroundColor Yellow
            Write-Host "   4. أعد تشغيل الكمبيوتر وأعد المحاولة" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ✗ حدث خطأ أثناء توليد Prisma Client" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. تشغيل migrations..." -ForegroundColor Yellow

# Run migrations
try {
    $migrateOutput = npx prisma migrate dev --name init 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ تم تشغيل migrations بنجاح" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ تحذير أثناء تشغيل migrations" -ForegroundColor Yellow
        Write-Host $migrateOutput -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠ حدث خطأ أثناء تشغيل migrations" -ForegroundColor Yellow
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== تم الانتهاء ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Yellow
Write-Host "1. تأكد من أن DATABASE_URL صحيح في .env.local" -ForegroundColor White
Write-Host "2. اختبر الاتصال: curl http://localhost:3000/api/db/connection" -ForegroundColor White
Write-Host "3. إذا استمرت المشاكل، راجع ملف: حل_مشكلة_الاتصال_بقاعدة_البيانات.md" -ForegroundColor White
Write-Host ""

