# Simple script to create .env file with PostgreSQL DATABASE_URL

$envPath = ".env"
$defaultDbUrl = "postgresql://postgres:password@localhost:5432/thanawy?schema=public"

if (Test-Path $envPath) {
    Write-Host "File .env already exists" -ForegroundColor Yellow
    Write-Host "Checking DATABASE_URL..." -ForegroundColor Cyan
    
    $content = Get-Content $envPath -Raw
    if ($content -match 'DATABASE_URL') {
        Write-Host "DATABASE_URL found in .env" -ForegroundColor Green
        $lines = Get-Content $envPath
        foreach ($line in $lines) {
            if ($line -match '^\s*DATABASE_URL\s*=') {
                Write-Host "Current: $line" -ForegroundColor Yellow
                break
            }
        }
    } else {
        Write-Host "Adding DATABASE_URL to .env..." -ForegroundColor Cyan
        Add-Content -Path $envPath -Value "`nDATABASE_URL=`"$defaultDbUrl`""
        Write-Host "Added DATABASE_URL" -ForegroundColor Green
    }
} else {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    $envContent = @"
# Database Configuration
DATABASE_URL="$defaultDbUrl"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXTAUTH_SECRET=your-nextauth-secret-change-this-in-production

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Thanawy

# Node Environment
NODE_ENV=development
"@
    Set-Content -Path $envPath -Value $envContent
    Write-Host "Created .env file with PostgreSQL DATABASE_URL" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor Yellow
Write-Host "2. Run: npx prisma migrate dev" -ForegroundColor Yellow
Write-Host "3. Run: npx prisma generate" -ForegroundColor Yellow
Write-Host "4. Check: npm run db:check" -ForegroundColor Yellow
Write-Host ""

