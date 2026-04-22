import fs from 'fs';
import path from 'path';
import { log, colors } from './lib/script-utils';

async function main() {
    const envPath = path.join(process.cwd(), '.env');
    const defaultDbUrl = 'postgresql://postgres:postgres@localhost:5432/thanawy?schema=public';

    if (fs.existsSync(envPath)) {
        log('File .env already exists', colors.yellow);
        log('Checking DATABASE_URL...', colors.cyan);

        let content = fs.readFileSync(envPath, 'utf-8');

        if (content.includes('DATABASE_URL')) {
            log('DATABASE_URL found in .env', colors.green);
            const match = content.match(/^\s*DATABASE_URL\s*=(.*)$/m);
            if (match) {
                log(`Current: ${match[0]}`, colors.yellow);
            }
        } else {
            log('Adding DATABASE_URL to .env...', colors.cyan);
            fs.appendFileSync(envPath, `\nDATABASE_URL="${defaultDbUrl}"`);
            log('Added DATABASE_URL', colors.green);
        }

        // Check for NextAuth variables
        if (content.includes('NEXTAUTH_SECRET') || content.includes('NEXTAUTH_URL')) {
            log('\n[WARNING] Found NextAuth variables in .env', colors.yellow);
            log("  Run 'npm run env:clean' to remove them", colors.cyan);
        }

    } else {
        log('Creating .env file...', colors.cyan);
        const envContent = `# Database Configuration
DATABASE_URL="${defaultDbUrl}"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Thanawy

# Node Environment
NODE_ENV=development
`;
        fs.writeFileSync(envPath, envContent, 'utf-8');
        log('Created .env file with PostgreSQL DATABASE_URL', colors.green);
    }

    log('\nNext steps:', colors.cyan);
    log('1. Make sure PostgreSQL is running', colors.yellow);
    log('2. Run: npx prisma migrate dev', colors.yellow);
    log('3. Run: npx prisma generate', colors.yellow);
    log('4. Check: npm run db:check', colors.yellow);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
