import path from 'path';
import fs from 'fs';
import { log, colors, killProcess, runCommand } from './lib/script-utils';

async function main() {
    const args = process.argv.slice(2);
    const shouldBuild = args.includes('--build') || args.includes('-Build');

    log('\n=== Fixing Prisma EPERM Error ===', colors.cyan);

    // Step 1: Stop Node.js processes
    log('\n[1/5] Stopping Node.js processes...', colors.yellow);
    await killProcess('node');

    // Wait a bit for processes to fully release handles
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Clean Prisma cache
    log('\n[2/5] Cleaning Prisma cache...', colors.yellow);

    const nodeModules = path.join(process.cwd(), 'node_modules');
    const prismaCache = path.join(nodeModules, '.prisma');
    const prismaClientCache = path.join(nodeModules, '@prisma', 'client', '.prisma');

    // Attempt to remove .prisma directory with retries
    if (fs.existsSync(prismaCache)) {
        let success = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts && !success) {
            try {
                fs.rmSync(prismaCache, { recursive: true, force: true });
                success = true;
                log('   Prisma cache cleaned successfully', colors.green);
            } catch (_error) {
                attempts++;
                log(`   Attempt ${attempts} failed, waiting...`, colors.yellow);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!success) {
            log('   Warning: Could not fully clean Prisma cache. Some files may be locked.', colors.red);
        }
    } else {
        log('   Prisma cache not found (already clean)', colors.gray);
    }

    // Clean client cache
    if (fs.existsSync(prismaClientCache)) {
        try {
            fs.rmSync(prismaClientCache, { recursive: true, force: true });
            log('   Prisma client cache cleaned', colors.green);
        } catch (_error) {
            log('   Warning: Could not clean Prisma client cache', colors.yellow);
        }
    }

    // Step 3: Verify Prisma schema
    log('\n[3/5] Verifying Prisma schema...', colors.yellow);
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
        log('   Error: prisma/schema.prisma not found!', colors.red);
        process.exit(1);
    }
    log('   Prisma schema found', colors.green);

    // Step 4: Generate Prisma Client
    log('\n[4/5] Generating Prisma Client...', colors.yellow);
    process.env.PRISMA_GENERATE_SKIP_AUTOINSTALL = 'true';

    if (runCommand('npx prisma generate --schema=./prisma/schema.prisma')) {
        log('   Prisma Client generated successfully', colors.green);
    } else {
        log('   Error generating Prisma Client', colors.red);
        log('   Tip: Make sure all Node processes are stopped and try again', colors.yellow);
        process.exit(1);
    }

    // Step 5: Build (if requested)
    if (shouldBuild) {
        log('\n[5/5] Building Next.js application...', colors.yellow);
        if (runCommand('npm run build')) {
            log('\n[SUCCESS] Build completed successfully!', colors.green);
        } else {
            log('\n[ERROR] Build failed', colors.red);
            process.exit(1);
        }
    } else {
        log('\n[5/5] Skipping build (use --build flag to build)', colors.gray);
    }

    log('\n=== Done ===', colors.green);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
