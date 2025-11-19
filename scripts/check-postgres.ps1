# Script to check PostgreSQL status and provide startup instructions
# سكربت للتحقق من حالة PostgreSQL وتوفير تعليمات التشغيل

Write-Host ""
Write-Host "=== PostgreSQL Status Check ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running on port 5432
$portCheck = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue

if ($portCheck.TcpTestSucceeded) {
    Write-Host "[SUCCESS] PostgreSQL is running on localhost:5432" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "[ERROR] PostgreSQL is not running on localhost:5432" -ForegroundColor Red
    Write-Host ""
    
    # Check if Docker is available
    $dockerAvailable = $false
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            $dockerAvailable = $true
            Write-Host "[INFO] Docker is available" -ForegroundColor Gray
            
            # Check if container exists
            $containerExists = docker ps -a --filter "name=thanawy-postgres" --format "{{.Names}}" 2>$null
            if ($containerExists -eq "thanawy-postgres") {
                Write-Host "[INFO] Docker container 'thanawy-postgres' exists" -ForegroundColor Gray
                $containerRunning = docker ps --filter "name=thanawy-postgres" --format "{{.Names}}" 2>$null
                if ($containerRunning -ne "thanawy-postgres") {
                    Write-Host "[INFO] Container exists but is stopped, starting..." -ForegroundColor Yellow
                    docker start thanawy-postgres 2>$null
                    Start-Sleep -Seconds 5
                    Write-Host "[SUCCESS] Container started. Waiting for PostgreSQL to be ready..." -ForegroundColor Green
                    Start-Sleep -Seconds 3
                    
                    # Verify it's running
                    $portCheckAfter = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
                    if ($portCheckAfter.TcpTestSucceeded) {
                        Write-Host "[SUCCESS] PostgreSQL is now running on localhost:5432" -ForegroundColor Green
                        Write-Host ""
                        exit 0
                    } else {
                        Write-Host "[WARNING] Container started but PostgreSQL is not ready yet. Please wait a few seconds and try again." -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "[INFO] Container is already running" -ForegroundColor Gray
                    Write-Host "[WARNING] Container is running but PostgreSQL port is not accessible" -ForegroundColor Yellow
                    Write-Host "  This might mean PostgreSQL is still starting up, or there's a configuration issue." -ForegroundColor Gray
                }
                
                Write-Host ""
                Write-Host "Solution: Try starting the container manually" -ForegroundColor Yellow
                Write-Host "  docker start thanawy-postgres" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "Or start with Docker Compose:" -ForegroundColor Yellow
                Write-Host "  docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
            } else {
                Write-Host ""
                Write-Host "Solution: Start PostgreSQL with Docker Compose" -ForegroundColor Yellow
                Write-Host "  docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "Or using npm:" -ForegroundColor Yellow
                Write-Host "  npm run db:start" -ForegroundColor Cyan
            }
        } else {
            $dockerAvailable = $false
        }
    } catch {
        $dockerAvailable = $false
    }
    
    if (-not $dockerAvailable) {
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Option 1: Install and start PostgreSQL with Docker (Recommended)" -ForegroundColor Cyan
        Write-Host "  1. Install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
        Write-Host "  2. Start Docker Desktop" -ForegroundColor Gray
        Write-Host "  3. Run: npm run db:start" -ForegroundColor Green
        Write-Host "     Or: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Option 2: Install PostgreSQL locally" -ForegroundColor Cyan
        Write-Host "  1. Download from https://www.postgresql.org/download/windows/" -ForegroundColor Gray
        Write-Host "  2. Install PostgreSQL with default settings" -ForegroundColor Gray
        Write-Host "  3. Start PostgreSQL service" -ForegroundColor Gray
        Write-Host "  4. Update DATABASE_URL in .env file with correct password" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Option 3: Use a cloud PostgreSQL service" -ForegroundColor Cyan
        Write-Host "  - Neon (https://neon.tech) - Free tier available" -ForegroundColor Gray
        Write-Host "  - Supabase (https://supabase.com) - Free tier available" -ForegroundColor Gray
        Write-Host "  - Railway (https://railway.app) - Free tier available" -ForegroundColor Gray
        Write-Host "  - Update DATABASE_URL in .env with your connection string" -ForegroundColor Gray
        Write-Host ""
        Write-Host "For detailed setup instructions, see:" -ForegroundColor Yellow
        Write-Host "  POSTGRESQL_SETUP.md" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Quick commands:" -ForegroundColor Yellow
        Write-Host "  npm run db:start      - Start PostgreSQL (Docker)" -ForegroundColor Gray
        Write-Host "  npm run db:stop       - Stop PostgreSQL (Docker)" -ForegroundColor Gray
        Write-Host "  npm run db:check-postgres - Check PostgreSQL status" -ForegroundColor Gray
    }
    
    Write-Host ""
    exit 1
}

