# Script to stop PostgreSQL database
# Usage: .\scripts\stop-db.ps1

Write-Host "🛑 Stopping PostgreSQL database..." -ForegroundColor Cyan

docker-compose -f docker-compose.dev.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to stop PostgreSQL" -ForegroundColor Red
    exit 1
}

