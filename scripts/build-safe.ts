import path from 'path';
import { log, colors, removeDir, killProcess, runCommand } from './lib/script-utils';

async function main() {
    log('\n=== Safe Build Process ===', colors.cyan);

    // 1. Stop Node processes
    log('\n[1/3] Stopping Node.js processes...', colors.yellow);
    await killProcess('node');

    // 2. Clean Prisma cache
    log('\n[2/3] Cleaning Prisma cache...', colors.yellow);
    const prismaCache = path.join(process.cwd(), 'node_modules', '.prisma');
    removeDir(prismaCache);

    // 3. Generate and build
    log('\n[3/3] Generating Prisma and building...', colors.yellow);

    log('Running prisma generate...', colors.gray);
    if (!runCommand('npx prisma generate')) {
        log('Prisma generate failed!', colors.red);
        process.exit(1);
    }

    log('Running next build...', colors.gray);
    if (!runCommand('npx next build')) {
        log('Build failed!', colors.red);
        process.exit(1);
    }

    log('\n[SUCCESS] Build completed!', colors.green);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
