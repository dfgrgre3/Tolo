#!/usr/bin/env ts-node
/**
 * Script للمساعدة في الانتقال من SQLite إلى PostgreSQL
 * 
 * الاستخدام:
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
  log('\n📋 فحص Prisma Schema...', 'cyan');
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    log('❌ ملف schema.prisma غير موجود!', 'red');
    return false;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  if (schemaContent.includes('provider = "sqlite"')) {
    log('⚠️  Schema لا يزال يستخدم SQLite', 'yellow');
    log('   يجب تغيير provider إلى "postgresql"', 'yellow');
    return false;
  }

  if (schemaContent.includes('provider = "postgresql"')) {
    log('✅ Schema يستخدم PostgreSQL', 'green');
    return true;
  }

  log('⚠️  لم يتم العثور على provider في Schema', 'yellow');
  return false;
}

function checkDatabaseUrl(): boolean {
  log('\n🔗 فحص DATABASE_URL...', 'cyan');
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    log('❌ DATABASE_URL غير موجود في متغيرات البيئة', 'red');
    log('   أضف DATABASE_URL إلى ملف .env', 'yellow');
    log('   أو استخدم: npm run db:setup', 'blue');
    log('   أو PowerShell: .\\scripts\\fix-postgresql-env.ps1', 'blue');
    return false;
  }

  if (dbUrl.startsWith('file:')) {
    log('❌ DATABASE_URL يشير إلى SQLite', 'red');
    log('   يجب تغييره إلى PostgreSQL connection string', 'yellow');
    log('   مثال: postgresql://user:password@localhost:5432/thanawy', 'blue');
    log('\n   للحل السريع:', 'cyan');
    log('   PowerShell: .\\scripts\\fix-postgresql-env.ps1', 'yellow');
    log('   أو عدّل ملف .env يدوياً', 'yellow');
    return false;
  }

  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    log('✅ DATABASE_URL يشير إلى PostgreSQL', 'green');
    log(`   ${dbUrl.replace(/:[^:@]+@/, ':****@')}`, 'blue');
    return true;
  }

  log('⚠️  DATABASE_URL بتنسيق غير معروف', 'yellow');
  log('   يجب أن يبدأ بـ postgresql:// أو postgres://', 'yellow');
  return false;
}

function checkDependencies(): boolean {
  log('\n📦 فحص المكتبات المطلوبة...', 'cyan');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json غير موجود!', 'red');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  let allGood = true;

  if (!deps['@prisma/client']) {
    log('❌ @prisma/client غير موجود', 'red');
    allGood = false;
  } else {
    log(`✅ @prisma/client: ${deps['@prisma/client']}`, 'green');
  }

  if (!deps['@prisma/adapter-pg']) {
    log('⚠️  @prisma/adapter-pg غير موجود (اختياري لكن موصى به)', 'yellow');
  } else {
    log(`✅ @prisma/adapter-pg: ${deps['@prisma/adapter-pg']}`, 'green');
  }

  if (!deps['prisma']) {
    log('❌ prisma غير موجود في devDependencies', 'red');
    allGood = false;
  } else {
    log(`✅ prisma: ${deps['prisma']}`, 'green');
  }

  return allGood;
}

function checkPrismaClient(): boolean {
  log('\n🔧 فحص Prisma Client...', 'cyan');
  
  try {
    const prismaClientPath = path.join(
      process.cwd(),
      'node_modules',
      '.prisma',
      'client',
      'index.js'
    );
    
    if (fs.existsSync(prismaClientPath)) {
      log('✅ Prisma Client موجود', 'green');
      return true;
    } else {
      log('⚠️  Prisma Client غير موجود', 'yellow');
      log('   قم بتشغيل: npx prisma generate', 'blue');
      return false;
    }
  } catch (error) {
    log('⚠️  خطأ في فحص Prisma Client', 'yellow');
    return false;
  }
}

function validateConnection(): boolean {
  log('\n🔌 التحقق من الاتصال بقاعدة البيانات...', 'cyan');
  
  try {
    // محاولة الاتصال باستخدام prisma db pull
    execSync('npx prisma db pull --schema=./prisma/schema.prisma', {
      stdio: 'pipe',
      timeout: 10000,
    });
    log('✅ الاتصال بقاعدة البيانات نجح', 'green');
    return true;
  } catch (error: any) {
    log('❌ فشل الاتصال بقاعدة البيانات', 'red');
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
  log('\n📚 تعليمات الإعداد:', 'cyan');
  log('\n1. تأكد من أن PostgreSQL يعمل:', 'blue');
  log('   docker run --name thanawy-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=thanawy -p 5432:5432 -d postgres:15', 'yellow');
  
  log('\n2. أضف DATABASE_URL إلى ملف .env:', 'blue');
  log('   DATABASE_URL="postgresql://postgres:password@localhost:5432/thanawy?schema=public"', 'yellow');
  
  log('\n3. قم بتشغيل migrations:', 'blue');
  log('   npx prisma migrate dev --name migrate_to_postgresql', 'yellow');
  
  log('\n4. قم بتوليد Prisma Client:', 'blue');
  log('   npx prisma generate', 'yellow');
  
  log('\n5. تحقق من الاتصال:', 'blue');
  log('   npx prisma studio', 'yellow');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--check';

  log('🚀 أداة التحقق من هجرة قاعدة البيانات إلى PostgreSQL\n', 'cyan');

  switch (command) {
    case '--check':
      log('🔍 فحص الإعدادات الحالية...\n', 'cyan');
      const schemaOk = checkPrismaSchema();
      const dbUrlOk = checkDatabaseUrl();
      const depsOk = checkDependencies();
      const clientOk = checkPrismaClient();

      log('\n📊 ملخص الفحص:', 'cyan');
      if (schemaOk && dbUrlOk && depsOk && clientOk) {
        log('✅ كل شيء جاهز!', 'green');
        log('\nالخطوة التالية: قم بتشغيل migrations', 'blue');
        log('   npx prisma migrate dev', 'yellow');
      } else {
        log('⚠️  هناك مشاكل تحتاج إلى إصلاح', 'yellow');
        log('\nاستخدم --setup لعرض تعليمات الإعداد', 'blue');
      }
      break;

    case '--validate':
      log('✅ التحقق من الاتصال...\n', 'cyan');
      if (checkPrismaSchema() && checkDatabaseUrl()) {
        validateConnection();
      } else {
        log('❌ يجب إصلاح المشاكل أولاً', 'red');
      }
      break;

    case '--setup':
      setupInstructions();
      break;

    default:
      log('❌ أمر غير معروف', 'red');
      log('\nالأوامر المتاحة:', 'cyan');
      log('  --check     فحص الإعدادات الحالية', 'blue');
      log('  --validate  التحقق من الاتصال بقاعدة البيانات', 'blue');
      log('  --setup     عرض تعليمات الإعداد', 'blue');
      process.exit(1);
  }
}

main();

