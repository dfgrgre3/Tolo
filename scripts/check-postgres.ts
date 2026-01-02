import { log, colors, checkPort, runCommand } from './lib/script-utils';
import { execSync } from 'child_process';

async function main() {
    log('\n=== PostgreSQL Status Check ===\n', colors.cyan);

    // Check if PostgreSQL is running on port 5432
    const isRunning = await checkPort(5432);

    if (isRunning) {
        log('[SUCCESS] PostgreSQL is running on localhost:5432\n', colors.green);
        process.exit(0);
    } else {
        log('[ERROR] PostgreSQL is not running on localhost:5432\n', colors.red);

        // Check if Docker is available
        let dockerAvailable = false;
        try {
            execSync('docker --version', { stdio: 'ignore' });
            dockerAvailable = true;
            log('[INFO] Docker is available', colors.gray);

            // Check if container exists
            try {
                const containerExists = execSync('docker ps -a --filter "name=thanawy-postgres" --format "{{.Names}}"', { encoding: 'utf-8' }).trim();

                if (containerExists === 'thanawy-postgres') {
                    log("[INFO] Docker container 'thanawy-postgres' exists", colors.gray);

                    const containerRunning = execSync('docker ps --filter "name=thanawy-postgres" --format "{{.Names}}"', { encoding: 'utf-8' }).trim();

                    if (containerRunning !== 'thanawy-postgres') {
                        log('[INFO] Container exists but is stopped, starting...', colors.yellow);
                        runCommand('docker start thanawy-postgres');

                        log('Waiting for PostgreSQL to be ready...', colors.gray);
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        if (await checkPort(5432)) {
                            log('[SUCCESS] PostgreSQL is now running on localhost:5432\n', colors.green);
                            process.exit(0);
                        } else {
                            log('[WARNING] Container started but PostgreSQL is not ready yet. Please wait a few seconds and try again.', colors.yellow);
                        }
                    } else {
                        log('[INFO] Container is already running', colors.gray);
                        log('[WARNING] Container is running but PostgreSQL port is not accessible', colors.yellow);
                        log("  This might mean PostgreSQL is still starting up, or there's a configuration issue.", colors.gray);
                    }

                    log('\nSolution: Try starting the container manually', colors.yellow);
                    log('  docker start thanawy-postgres', colors.cyan);
                    log('\nOr start with Docker Compose:', colors.yellow);
                    log('  docker-compose -f docker-compose.dev.yml up -d', colors.cyan);
                } else {
                    log('\nSolution: Start PostgreSQL with Docker Compose', colors.yellow);
                    log('  docker-compose -f docker-compose.dev.yml up -d', colors.cyan);
                    log('\nOr using npm:', colors.yellow);
                    log('  npm run db:start', colors.cyan);
                }
            } catch (e) {
                // Docker command failed
            }
        } catch (e) {
            dockerAvailable = false;
        }

        if (!dockerAvailable) {
            log('\nSolutions:', colors.yellow);
            log('\nOption 1: Install and start PostgreSQL with Docker (Recommended)', colors.cyan);
            log('  1. Install Docker Desktop', colors.gray);
            log('  2. Run: npm run db:start', colors.green);

            log('\nOption 2: Install PostgreSQL locally', colors.cyan);
            log('  1. Download and install PostgreSQL', colors.gray);
            log('  2. Start PostgreSQL service', colors.gray);
            log('  3. Update DATABASE_URL in .env file', colors.gray);

            log('\nOption 3: Use a cloud PostgreSQL service', colors.cyan);
            log('  - Neon, Supabase, Railway, etc.', colors.gray);

            log('\nQuick commands:', colors.yellow);
            log('  npm run db:start      - Start PostgreSQL (Docker)', colors.gray);
            log('  npm run db:stop       - Stop PostgreSQL (Docker)', colors.gray);
            log('  npm run db:check-postgres - Check PostgreSQL status', colors.gray);
        }

        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
