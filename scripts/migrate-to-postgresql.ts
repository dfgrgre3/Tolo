#!/usr/bin/env ts-node
/**
 * Script ظ„ظ„ظ…ط³ط§ط¹ط¯ط© ظپظٹ ط§ظ„ط§ظ†طھظ‚ط§ظ„ ظ…ظ† SQLite ط¥ظ„ظ‰ PostgreSQL
 * 
 * ط§ظ„ط§ط³طھط®ط¯ط§ظ…:
 *   ts-node scripts/migrate-to-postgresql.ts --check
 *   ts-node scripts/migrate-to-postgresql.ts --validate
 *   ts-node scripts/migrate-to-postgresql.ts --setup
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrismaSchema(): boolean {
  log('\nًں“‹ ظپط­طµ Prisma Schema...', 'cyan');
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    log('â‌Œ ظ…ظ„ظپ schema.prisma ط؛ظٹط± ظ…ظˆط¬ظˆط¯!', 'red');
    return false;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  if (schemaContent.includes('provider = "sqlite"')) {
    log('âڑ ï¸ڈ  Schema ظ„ط§ ظٹط²ط§ظ„ ظٹط³طھط®ط¯ظ… SQLite', 'yellow');
    log('   ظٹط¬ط¨ طھط؛ظٹظٹط± provider ط¥ظ„ظ‰ "postgresql"', 'yellow');
    return false;
  }

  if (schemaContent.includes('provider = "postgresql"')) {
    log('âœ… Schema ظٹط³طھط®ط¯ظ… PostgreSQL', 'green');
    return true;
  }

  log('âڑ ï¸ڈ  ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ provider ظپظٹ Schema', 'yellow');
  return false;
}

function checkDatabaseUrl(): boolean {
  log('\nًں”— ظپط­طµ DATABASE_URL...', 'cyan');
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    log('â‌Œ DATABASE_URL ط؛ظٹط± ظ…ظˆط¬ظˆط¯ ظپظٹ ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط©', 'red');
    log('   ط£ط¶ظپ DATABASE_URL ط¥ظ„ظ‰ ظ…ظ„ظپ .env', 'yellow');
    log('   ط£ظˆ ط§ط³طھط®ط¯ظ…: npm run db:setup', 'blue');
    log('   ط£ظˆ PowerShell: .\\scripts\\fix-postgresql-env.ps1', 'blue');
    return false;
  }

  if (dbUrl.startsWith('file:')) {
    log('â‌Œ DATABASE_URL ظٹط´ظٹط± ط¥ظ„ظ‰ SQLite', 'red');
    log('   ظٹط¬ط¨ طھط؛ظٹظٹط±ظ‡ ط¥ظ„ظ‰ PostgreSQL connection string', 'yellow');
    log('   ظ…ط«ط§ظ„: postgresql://user:password@localhost:5432/thanawy', 'blue');
    log('\n   ظ„ظ„ط­ظ„ ط§ظ„ط³ط±ظٹط¹:', 'cyan');
    log('   PowerShell: .\\scripts\\fix-postgresql-env.ps1', 'yellow');
    log('   ط£ظˆ ط¹ط¯ظ‘ظ„ ظ…ظ„ظپ .env ظٹط¯ظˆظٹط§ظ‹', 'yellow');
    return false;
  }

  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    log('âœ… DATABASE_URL ظٹط´ظٹط± ط¥ظ„ظ‰ PostgreSQL', 'green');
    log(`   ${dbUrl.replace(/:[^:@]+@/, ':****@')}`, 'blue');
    return true;
  }

  log('âڑ ï¸ڈ  DATABASE_URL ط¨طھظ†ط³ظٹظ‚ ط؛ظٹط± ظ…ط¹ط±ظˆظپ', 'yellow');
  log('   ظٹط¬ط¨ ط£ظ† ظٹط¨ط¯ط£ ط¨ظ€ postgresql:// ط£ظˆ postgres://', 'yellow');
  return false;
}

function checkDependencies(): boolean {
  log('\nًں“¦ ظپط­طµ ط§ظ„ظ…ظƒطھط¨ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط©...', 'cyan');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log('â‌Œ package.json ط؛ظٹط± ظ…ظˆط¬ظˆط¯!', 'red');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  let allGood = true;

  if (!deps['@prisma/client']) {
    log('â‌Œ @prisma/client ط؛ظٹط± ظ…ظˆط¬ظˆط¯', 'red');
    allGood = false;
  } else {
    log(`âœ… @prisma/client: ${deps['@prisma/client']}`, 'green');
  }

  if (!deps['@prisma/adapter-pg']) {
    log('âڑ ï¸ڈ  @prisma/adapter-pg ط؛ظٹط± ظ…ظˆط¬ظˆط¯ (ط§ط®طھظٹط§ط±ظٹ ظ„ظƒظ† ظ…ظˆطµظ‰ ط¨ظ‡)', 'yellow');
  } else {
    log(`âœ… @prisma/adapter-pg: ${deps['@prisma/adapter-pg']}`, 'green');
  }

  if (!deps['prisma']) {
    log('â‌Œ prisma ط؛ظٹط± ظ…ظˆط¬ظˆط¯ ظپظٹ devDependencies', 'red');
    allGood = false;
  } else {
    log(`âœ… prisma: ${deps['prisma']}`, 'green');
  }

  return allGood;
}

function checkPrismaClient(): boolean {
  log('\nًں”§ ظپط­طµ Prisma Client...', 'cyan');
  
  try {
    const prismaClientPath = path.join(
      process.cwd(),
      'node_modules',
      '.prisma',
      'client',
      'index.js'
    );
    
    if (fs.existsSync(prismaClientPath)) {
      log('âœ… Prisma Client ظ…ظˆط¬ظˆط¯', 'green');
      return true;
    } else {
      log('âڑ ï¸ڈ  Prisma Client ط؛ظٹط± ظ…ظˆط¬ظˆط¯', 'yellow');
      log('   ظ‚ظ… ط¨طھط´ط؛ظٹظ„: npx prisma generate', 'blue');
      return false;
    }
  } catch (_error) {
    log('âڑ ï¸ڈ  ط®ط·ط£ ظپظٹ ظپط­طµ Prisma Client', 'yellow');
    return false;
  }
}

function validateConnection(): boolean {
  log('\nًں”Œ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ...', 'cyan');
  
  try {
    // ظ…ط­ط§ظˆظ„ط© ط§ظ„ط§طھطµط§ظ„ ط¨ط§ط³طھط®ط¯ط§ظ… prisma db pull
    execSync('npx prisma db pull --schema=./prisma/schema.prisma', {
      stdio: 'pipe',
      timeout: 10000,
    });
    log('âœ… ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ†ط¬ط­', 'green');
    return true;
  } catch (error: any) {
    log('â‌Œ ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ', 'red');
    if (error.stdout) {
      log(`   ${error.stdout.toString()}`, 'yellow');
    }
    if (error.stderr) {
      log(`   ${error.stderr.toString()}`, 'yellow');
    }
    return false;
  }
}

function setupInstructions() {
  log('\nًں“ڑ طھط¹ظ„ظٹظ…ط§طھ ط§ظ„ط¥ط¹ط¯ط§ط¯:', 'cyan');
  log('\n1. طھط£ظƒط¯ ظ…ظ† ط£ظ† PostgreSQL ظٹط¹ظ…ظ„:', 'blue');
  log('   docker run --name thanawy-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=thanawy -p 5432:5432 -d postgres:15', 'yellow');
  
  log('\n2. ط£ط¶ظپ DATABASE_URL ط¥ظ„ظ‰ ظ…ظ„ظپ .env:', 'blue');
  log('   DATABASE_URL="postgresql://postgres:password@localhost:5432/thanawy?schema=public"', 'yellow');
  
  log('\n3. ظ‚ظ… ط¨طھط´ط؛ظٹظ„ migrations:', 'blue');
  log('   npx prisma migrate dev --name migrate_to_postgresql', 'yellow');
  
  log('\n4. ظ‚ظ… ط¨طھظˆظ„ظٹط¯ Prisma Client:', 'blue');
  log('   npx prisma generate', 'yellow');
  
  log('\n5. طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط§طھطµط§ظ„:', 'blue');
  log('   npx prisma studio', 'yellow');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--check';

  log('ًںڑ€ ط£ط¯ط§ط© ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظ‡ط¬ط±ط© ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¥ظ„ظ‰ PostgreSQL\n', 'cyan');

  switch (command) {
    case '--check':
      log('ًں”چ ظپط­طµ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط­ط§ظ„ظٹط©...\n', 'cyan');
      const schemaOk = checkPrismaSchema();
      const dbUrlOk = checkDatabaseUrl();
      const depsOk = checkDependencies();
      const clientOk = checkPrismaClient();

      log('\nًں“ٹ ظ…ظ„ط®طµ ط§ظ„ظپط­طµ:', 'cyan');
      if (schemaOk && dbUrlOk && depsOk && clientOk) {
        log('âœ… ظƒظ„ ط´ظٹط، ط¬ط§ظ‡ط²!', 'green');
        log('\nط§ظ„ط®ط·ظˆط© ط§ظ„طھط§ظ„ظٹط©: ظ‚ظ… ط¨طھط´ط؛ظٹظ„ migrations', 'blue');
        log('   npx prisma migrate dev', 'yellow');
      } else {
        log('âڑ ï¸ڈ  ظ‡ظ†ط§ظƒ ظ…ط´ط§ظƒظ„ طھط­طھط§ط¬ ط¥ظ„ظ‰ ط¥طµظ„ط§ط­', 'yellow');
        log('\nط§ط³طھط®ط¯ظ… --setup ظ„ط¹ط±ط¶ طھط¹ظ„ظٹظ…ط§طھ ط§ظ„ط¥ط¹ط¯ط§ط¯', 'blue');
      }
      break;

    case '--validate':
      log('âœ… ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط§طھطµط§ظ„...\n', 'cyan');
      if (checkPrismaSchema() && checkDatabaseUrl()) {
        validateConnection();
      } else {
        log('â‌Œ ظٹط¬ط¨ ط¥طµظ„ط§ط­ ط§ظ„ظ…ط´ط§ظƒظ„ ط£ظˆظ„ط§ظ‹', 'red');
      }
      break;

    case '--setup':
      setupInstructions();
      break;

    default:
      log('â‌Œ ط£ظ…ط± ط؛ظٹط± ظ…ط¹ط±ظˆظپ', 'red');
      log('\nط§ظ„ط£ظˆط§ظ…ط± ط§ظ„ظ…طھط§ط­ط©:', 'cyan');
      log('  --check     ظپط­طµ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط­ط§ظ„ظٹط©', 'blue');
      log('  --validate  ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ', 'blue');
      log('  --setup     ط¹ط±ط¶ طھط¹ظ„ظٹظ…ط§طھ ط§ظ„ط¥ط¹ط¯ط§ط¯', 'blue');
      process.exit(1);
  }
}

main();

