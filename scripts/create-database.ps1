# Script to create PostgreSQL database
# Usage: .\scripts\create-database.ps1

param(
    [string]$Password = "",
    [string]$DatabaseName = "thanawy",
    [string]$User = "postgres",
    [string]$Host = "localhost",
    [int]$Port = 5432
)

Write-Host "🗄️  إنشاء قاعدة البيانات PostgreSQL" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
$psqlPath = $null
$possiblePaths = @(
    "$env:ProgramFiles\PostgreSQL\15\bin\psql.exe",
    "$env:ProgramFiles\PostgreSQL\16\bin\psql.exe",
    "$env:ProgramFiles\PostgreSQL\14\bin\psql.exe",
    "$env:ProgramFiles (x86)\PostgreSQL\15\bin\psql.exe",
    "$env:ProgramFiles (x86)\PostgreSQL\16\bin\psql.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        break
    }
}

if (-not $psqlPath) {
    Write-Host "❌ لم يتم العثور على psql.exe" -ForegroundColor Red
    Write-Host ""
    Write-Host "تأكد من:" -ForegroundColor Yellow
    Write-Host "1. تثبيت PostgreSQL" -ForegroundColor White
    Write-Host "2. إضافة PostgreSQL إلى PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "أو استخدم pgAdmin لإنشاء قاعدة البيانات يدوياً" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ تم العثور على PostgreSQL في: $psqlPath" -ForegroundColor Green
Write-Host ""

# Get password if not provided
if ([string]::IsNullOrEmpty($Password)) {
    $securePassword = Read-Host "أدخل كلمة مرور PostgreSQL" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

if ([string]::IsNullOrEmpty($Password)) {
    Write-Host "❌ كلمة المرور مطلوبة" -ForegroundColor Red
    exit 1
}

Write-Host "📝 إنشاء قاعدة البيانات '$DatabaseName'..." -ForegroundColor Cyan

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $Password

# Create database
$createDbQuery = "CREATE DATABASE $DatabaseName;"
$createDbCommand = "& `"$psqlPath`" -h $Host -p $Port -U $User -d postgres -c `"$createDbQuery`""

try {
    Invoke-Expression $createDbCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم إنشاء قاعدة البيانات '$DatabaseName' بنجاح!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 معلومات الاتصال:" -ForegroundColor Yellow
        Write-Host "   Database: $DatabaseName" -ForegroundColor White
        Write-Host "   User: $User" -ForegroundColor White
        Write-Host "   Host: $Host" -ForegroundColor White
        Write-Host "   Port: $Port" -ForegroundColor White
        Write-Host ""
        Write-Host "🔗 Connection String:" -ForegroundColor Yellow
        Write-Host "postgresql://$User`:$Password@$Host`:$Port/$DatabaseName?schema=public" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  احفظ هذا الـ Connection String في ملف .env" -ForegroundColor Yellow
    } else {
        # Check if database already exists
        $checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"
        $checkDbCommand = "& `"$psqlPath`" -h $Host -p $Port -U $User -d postgres -t -c `"$checkDbQuery`""
        $dbExists = Invoke-Expression $checkDbCommand
        
        if ($dbExists -match "1") {
            Write-Host "ℹ️  قاعدة البيانات '$DatabaseName' موجودة بالفعل" -ForegroundColor Yellow
        } else {
            Write-Host "❌ فشل إنشاء قاعدة البيانات" -ForegroundColor Red
            Write-Host "تأكد من:" -ForegroundColor Yellow
            Write-Host "1. كلمة المرور صحيحة" -ForegroundColor White
            Write-Host "2. PostgreSQL قيد التشغيل" -ForegroundColor White
            Write-Host "3. لديك صلاحيات إنشاء قاعدة بيانات" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ خطأ: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "استخدم pgAdmin لإنشاء قاعدة البيانات يدوياً:" -ForegroundColor Yellow
    Write-Host "1. افتح pgAdmin 4" -ForegroundColor White
    Write-Host "2. انقر بزر الماوس الأيمن على 'Databases' > 'Create' > 'Database'" -ForegroundColor White
    Write-Host "3. أدخل الاسم: $DatabaseName" -ForegroundColor White
    Write-Host "4. انقر 'Save'" -ForegroundColor White
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""

