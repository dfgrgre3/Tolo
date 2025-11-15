# Script to start PostgreSQL database using Docker
# Usage: .\scripts\start-db.ps1

Write-Host "🚀 Starting PostgreSQL database..." -ForegroundColor Cyan

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if docker-compose.yml exists
if (-Not (Test-Path "docker-compose.dev.yml")) {
    Write-Host "❌ docker-compose.dev.yml not found" -ForegroundColor Red
    exit 1
}

# Start PostgreSQL
Write-Host "📦 Starting PostgreSQL container..." -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml up -d postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database connection string:" -ForegroundColor Yellow
    Write-Host "postgresql://postgres:postgres@localhost:5432/thanawy?schema=public" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop the database, run:" -ForegroundColor Yellow
    Write-Host "docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
} else {
    Write-Host "❌ Failed to start PostgreSQL" -ForegroundColor Red
    exit 1
}

