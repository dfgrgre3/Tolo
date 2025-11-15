# PowerShell script to fix DATABASE_URL for PostgreSQL migration
# This script helps update .env file after changing Prisma schema to PostgreSQL

param(
    [string]$DatabaseUrl = "",
    [switch]$Interactive = $true
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "PostgreSQL Migration Helper" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot ".." ".env"
$envPath = Resolve-Path $envPath -ErrorAction SilentlyContinue

if (-not $envPath) {
    Write-Host "ملف .env غير موجود!" -ForegroundColor Red
    Write-Host "سيتم إنشاء ملف .env.example كمرجع" -ForegroundColor Yellow
    
    $examplePath = Join-Path $PSScriptRoot ".." ".env.example"
    if (Test-Path $examplePath) {
        Write-Host ""
        Write-Host "انسخ محتوى .env.example إلى .env:" -ForegroundColor Cyan
        Write-Host "Copy-Item .env.example .env" -ForegroundColor Yellow
    }
    exit 1
}

# Read current .env file
$envLines = Get-Content $envPath
$envContent = Get-Content $envPath -Raw

# Check current DATABASE_URL by reading line by line
$currentDbUrl = ""
foreach ($line in $envLines) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)$') {
        $currentDbUrl = $matches[1].Trim()
        $currentDbUrl = $currentDbUrl.Trim('"')
        $currentDbUrl = $currentDbUrl.Trim("'")
        Write-Host "DATABASE_URL الحالي: $currentDbUrl" -ForegroundColor Yellow
        break
    }
}

# Check if it's already PostgreSQL
if ($currentDbUrl -like "postgresql://*" -or $currentDbUrl -like "postgres://*") {
    Write-Host "DATABASE_URL يشير بالفعل إلى PostgreSQL" -ForegroundColor Green
    exit 0
}

# Check if it's SQLite
if ($currentDbUrl -like "file:*") {
    Write-Host "تم اكتشاف SQLite في DATABASE_URL" -ForegroundColor Yellow
    Write-Host "يجب تغييره إلى PostgreSQL" -ForegroundColor Yellow
    Write-Host ""
}

# Get new DATABASE_URL
if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    if ($Interactive) {
        Write-Host ""
        Write-Host "أدخل DATABASE_URL الجديد لـ PostgreSQL:" -ForegroundColor Cyan
        Write-Host "مثال: postgresql://postgres:password@localhost:5432/thanawy?schema=public" -ForegroundColor Gray
        Write-Host ""
        
        $DatabaseUrl = Read-Host "DATABASE_URL"
        
        if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
            Write-Host "DATABASE_URL فارغ!" -ForegroundColor Red
            exit 1
        }
    } else {
        # Default for non-interactive mode
        $DatabaseUrl = "postgresql://postgres:password@localhost:5432/thanawy?schema=public"
        Write-Host "استخدام DATABASE_URL افتراضي (للتطوير المحلي)" -ForegroundColor Yellow
        Write-Host "$DatabaseUrl" -ForegroundColor Gray
    }
}

# Validate PostgreSQL URL format
if ($DatabaseUrl -notlike "postgresql://*" -and $DatabaseUrl -notlike "postgres://*") {
    Write-Host "DATABASE_URL يجب أن يبدأ بـ postgresql:// أو postgres://" -ForegroundColor Red
    exit 1
}

# Update .env file
Write-Host ""
Write-Host "تحديث ملف .env..." -ForegroundColor Cyan

# Replace or add DATABASE_URL by processing line by line
$found = $false
$newEnvLines = @()
foreach ($line in $envLines) {
    if ($line -match '^\s*DATABASE_URL\s*=') {
        $newEnvLines += "DATABASE_URL=`"$DatabaseUrl`""
        $found = $true
        Write-Host "تم تحديث DATABASE_URL الموجود" -ForegroundColor Green
    } else {
        $newEnvLines += $line
    }
}

if (-not $found) {
    # Add new
    $newEnvLines += ""
    $newEnvLines += "# Database Configuration"
    $newEnvLines += "DATABASE_URL=`"$DatabaseUrl`""
    Write-Host "تم إضافة DATABASE_URL جديد" -ForegroundColor Green
}

$envContent = $newEnvLines -join "`n"

# Write back to file
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host ""
Write-Host "تم تحديث ملف .env بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Cyan
Write-Host "1. تأكد من أن PostgreSQL يعمل" -ForegroundColor Yellow
Write-Host "2. قم بتشغيل: npx prisma migrate dev" -ForegroundColor Yellow
Write-Host "3. قم بتشغيل: npx prisma generate" -ForegroundColor Yellow
Write-Host "4. تحقق من الاتصال: npm run db:check" -ForegroundColor Yellow
Write-Host ""
