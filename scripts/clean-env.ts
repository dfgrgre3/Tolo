import fs from 'fs';
import path from 'path';
import { log, colors } from './lib/script-utils';

async function main() {
    const envPath = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) {
        log('File .env not found. Nothing to clean.', colors.yellow);
        process.exit(0);
    }

    log('\n=== Cleaning .env file from NextAuth variables ===\n', colors.cyan);

    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    const originalLineCount = lines.length;

    const filteredLines: string[] = [];
    const removedVariables: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.includes('NEXTAUTH_SECRET') && !trimmedLine.includes('NEXTAUTH_URL')) {
            filteredLines.push(line);
        } else {
            if (trimmedLine.includes('NEXTAUTH_SECRET')) removedVariables.push('NEXTAUTH_SECRET');
            if (trimmedLine.includes('NEXTAUTH_URL')) removedVariables.push('NEXTAUTH_URL');
        }
    }

    // Clean up multiple empty lines
    const cleanedLines: string[] = [];
    let emptyCount = 0;

    for (const line of filteredLines) {
        if (!line.trim()) {
            emptyCount++;
            if (emptyCount <= 2) {
                cleanedLines.push(line);
            }
        } else {
            emptyCount = 0;
            cleanedLines.push(line);
        }
    }

    const content = cleanedLines.join('\n').trim();
    const originalContent = lines.join('\n');

    if (content === originalContent) {
        log('[SUCCESS] No NextAuth variables found in .env file', colors.green);
    } else {
        // Backup
        const backupPath = `.env.backup.${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}`;
        fs.copyFileSync(envPath, backupPath);
        log(`[INFO] Created backup: ${backupPath}`, colors.gray);

        fs.writeFileSync(envPath, content, 'utf-8');
        log('[SUCCESS] Cleaned .env file from NextAuth variables', colors.green);

        if (removedVariables.length > 0) {
            log('\nRemoved variables:', colors.yellow);
            [...new Set(removedVariables)].forEach(v => log(`  - ${v}`, colors.gray));
        }
    }

    log('\n[TIP] Make sure JWT_SECRET is set in your .env file\n', colors.cyan);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
