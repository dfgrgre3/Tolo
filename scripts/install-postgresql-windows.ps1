# Script to guide PostgreSQL installation on Windows
# Usage: .\scripts\install-postgresql-windows.ps1

Write-Host "📦 دليل تثبيت PostgreSQL على Windows" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "الخطوة 1: تحميل PostgreSQL" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow
Write-Host "1. افتح المتصفح واذهب إلى:" -ForegroundColor White
Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Green
Write-Host ""
Write-Host "2. انقر على 'Download the installer'" -ForegroundColor White
Write-Host ""
Write-Host "3. اختر أحدث إصدار (PostgreSQL 15 أو 16)" -ForegroundColor White
Write-Host ""
Write-Host "4. حمّل المثبت المناسب لنظامك (64-bit)" -ForegroundColor White
Write-Host ""

Write-Host "الخطوة 2: تثبيت PostgreSQL" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow
Write-Host "1. شغّل المثبت الذي حمّلته" -ForegroundColor White
Write-Host ""
Write-Host "2. أثناء التثبيت:" -ForegroundColor White
Write-Host "   - اختر 'PostgreSQL Server'" -ForegroundColor Cyan
Write-Host "   - اختر مجلد التثبيت (افتراضي: C:\Program Files\PostgreSQL\15)" -ForegroundColor Cyan
Write-Host "   - اختر 'data directory' (افتراضي: C:\Program Files\PostgreSQL\15\data)" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. عند السؤال عن كلمة المرور:" -ForegroundColor White
Write-Host "   - ضع كلمة مرور قوية (مثلاً: postgres123)" -ForegroundColor Cyan
Write-Host "   - احفظ هذه الكلمة! ستحتاجها لاحقاً" -ForegroundColor Red
Write-Host ""
Write-Host "4. عند السؤال عن المنفذ:" -ForegroundColor White
Write-Host "   - اتركه على 5432 (الافتراضي)" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. عند السؤال عن Locale:" -ForegroundColor White
Write-Host "   - اختر 'Default locale'" -ForegroundColor Cyan
Write-Host ""

Write-Host "الخطوة 3: إنشاء قاعدة البيانات" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow
Write-Host "بعد التثبيت، شغّل أحد الأوامر التالية:" -ForegroundColor White
Write-Host ""
Write-Host "Option A: استخدام pgAdmin (واجهة رسومية)" -ForegroundColor Cyan
Write-Host "  1. افتح pgAdmin 4 من قائمة Start" -ForegroundColor White
Write-Host "  2. أدخل كلمة المرور التي وضعتها أثناء التثبيت" -ForegroundColor White
Write-Host "  3. انقر بزر الماوس الأيمن على 'Databases' > 'Create' > 'Database'" -ForegroundColor White
Write-Host "  4. أدخل الاسم: thanawy" -ForegroundColor White
Write-Host "  5. انقر 'Save'" -ForegroundColor White
Write-Host ""
Write-Host "Option B: استخدام PowerShell (سطر الأوامر)" -ForegroundColor Cyan
Write-Host "  بعد التثبيت، شغّل:" -ForegroundColor White
Write-Host "  .\scripts\create-database.ps1" -ForegroundColor Green
Write-Host ""

Write-Host "الخطوة 4: تحديث ملف .env" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Yellow
Write-Host "افتح ملف .env وأضف أو حدث:" -ForegroundColor White
Write-Host ""
Write-Host 'DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/thanawy?schema=public"' -ForegroundColor Green
Write-Host ""
Write-Host "استبدل YOUR_PASSWORD بكلمة المرور التي وضعتها أثناء التثبيت" -ForegroundColor Yellow
Write-Host ""

Write-Host "الخطوة 5: تشغيل Migrations" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow
Write-Host "بعد إعداد قاعدة البيانات، شغّل:" -ForegroundColor White
Write-Host ""
Write-Host "  npx prisma migrate dev --name comprehensive_database_optimization" -ForegroundColor Green
Write-Host "  npx prisma generate" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ اكتمل الدليل!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 نصيحة: إذا واجهت مشاكل، استخدم قاعدة بيانات سحابية:" -ForegroundColor Yellow
Write-Host "   - Neon: https://neon.tech (مجاني)" -ForegroundColor Cyan
Write-Host "   - Supabase: https://supabase.com (مجاني)" -ForegroundColor Cyan
Write-Host ""

