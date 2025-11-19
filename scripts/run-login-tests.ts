/**
 * Script to run comprehensive login system tests
 * Tests both frontend and backend components
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 Running Comprehensive Login System Tests\n');
console.log('='.repeat(60));

const testFiles = [
  'tests/integration/api/login-comprehensive.test.ts',
  'tests/unit/login-service-comprehensive.test.ts',
  'tests/e2e/login-comprehensive.test.ts',
  'tests/components/LoginForm.test.tsx',
];

let passed = 0;
let failed = 0;

for (const testFile of testFiles) {
  const filePath = join(process.cwd(), testFile);
  
  if (!existsSync(filePath)) {
    console.log(`⚠️  Test file not found: ${testFile}`);
    continue;
  }

  console.log(`\n📝 Running: ${testFile}`);
  console.log('-'.repeat(60));

  try {
    execSync(`npm test -- ${testFile} --passWithNoTests`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    passed++;
    console.log(`✅ Passed: ${testFile}`);
  } catch (error) {
    failed++;
    console.log(`❌ Failed: ${testFile}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary\n');
console.log(`Total Test Files: ${testFiles.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / testFiles.length) * 100).toFixed(1)}%\n`);

process.exit(failed > 0 ? 1 : 0);

