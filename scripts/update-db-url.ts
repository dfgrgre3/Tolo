import fs from 'fs';
import path from 'path';
import { log, colors } from './lib/script-utils';

async function main() {
    const envPath = path.join(process.cwd(), '.env');
    const newDbUrl = 'postgresql://postgres:password@localhost:5432/thanawy?schema=public';

    if (!fs.existsSync(envPath)) {
        log('.env file not found!', colors.red);
        process.exit(1);
    }

    log('Updating DATABASE_URL in .env...', colors.cyan);

    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    let updated = false;
    const newLines: string[] = [];

    for (const line of lines) {
        if (line.match(/^\s*DATABASE_URL\s*=/)) {
            newLines.push(`DATABASE_URL="${newDbUrl}"`);
            updated = true;
            log(`Updated: ${line}`, colors.yellow);
            log(`To: DATABASE_URL="${newDbUrl}"`, colors.green);
        } else {
            newLines.push(line);
        }
    }

    if (!updated) {
        log('DATABASE_URL not found, adding it...', colors.yellow);
        newLines.push('');
        newLines.push('# Database Configuration');
        newLines.push(`DATABASE_URL="${newDbUrl}"`);
    }

    fs.writeFileSync(envPath, newLines.join('\n'), 'utf-8');

    log('\nDone! DATABASE_URL updated to PostgreSQL', colors.green);
    log('\nNote: Update the password if needed:', colors.yellow);
    log('  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/thanawy?schema=public"', colors.gray);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
