import path from 'path';
import { log, colors, removeDir, killProcess } from './lib/script-utils';
import os from 'os';

async function main() {
    log('Clearing Next.js cache and build artifacts...', colors.cyan);

    // Stop running processes
    await killProcess('node');

    // Define paths to clear
    const rootDir = process.cwd();
    const nextDir = path.join(rootDir, '.next');
    const nodeModulesCache = path.join(rootDir, 'node_modules', '.cache');

    // Clear directories
    removeDir(nextDir);
    removeDir(nodeModulesCache);

    // Clear Turbopack cache
    // On Windows: %TEMP%\.turbo
    // On Linux/Mac: /tmp/.turbo (usually, or check env vars)
    let turboCachePath = '';
    if (os.platform() === 'win32') {
        turboCachePath = path.join(os.tmpdir(), '.turbo');
    } else {
        // Default for many linux systems, though it can vary
        turboCachePath = path.join(os.tmpdir(), '.turbo');
    }

    if (turboCachePath) {
        removeDir(turboCachePath);
    }

    log('\n✓ Cache cleared successfully!', colors.green);
    log('\nNext steps:', colors.cyan);
    log('1. Clear your browser cache', colors.white);
    log('2. Restart the dev server: npm run dev', colors.white);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
