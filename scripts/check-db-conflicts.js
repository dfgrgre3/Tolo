#!/usr/bin/env node

/**
 * Script to check for database connection conflicts
 * يتحقق من تضارب الاتصال بقاعدة البيانات
 * 
 * Usage: node scripts/check-db-conflicts.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for database connection conflicts...\n');

let hasErrors = false;
let hasWarnings = false;

// Helper function to recursively find all TypeScript files
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== 'node_modules' && file !== '.next' && !file.startsWith('.')) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Helper function to remove comments from code
function removeComments(content) {
  // Remove single-line comments
  content = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  return content;
}


// 1. Check for direct PrismaClient instantiation
console.log('1️⃣ Checking for direct PrismaClient instantiation...');
try {
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    console.log('⚠️  src/ directory not found');
    hasWarnings = true;
  } else {
    const tsFiles = findTsFiles(srcDir);
    const problematicFiles = [];
    
    tsFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Skip db-unified.ts (which is allowed to create PrismaClient)
      if (fileName === 'db-unified.ts') {
        return;
      }
      
      // Remove comments and check for "new PrismaClient"
      const codeWithoutComments = removeComments(content);
      
      // Check for "new PrismaClient(" in actual code (not comments)
      const regex = /new\s+PrismaClient\s*\(/g;
      let match;
      while ((match = regex.exec(codeWithoutComments)) !== null) {
        // Double-check it's not in a string
        const beforeMatch = codeWithoutComments.substring(0, match.index);
        const stringMatches = (beforeMatch.match(/['"`]/g) || []).length;
        // If odd number of quotes before, we're in a string
        if (stringMatches % 2 === 0) {
          problematicFiles.push({
            file: path.relative(process.cwd(), filePath),
            line: content.substring(0, content.indexOf(match[0])).split('\n').length
          });
        }
      }
    });
    
    if (problematicFiles.length > 0) {
      console.log('❌ Found direct PrismaClient instantiation outside db-unified.ts:');
      problematicFiles.forEach(({ file, line }) => {
        console.log(`   ${file}:${line}`);
      });
      hasErrors = true;
    } else {
      console.log('✅ No problematic PrismaClient instantiation found');
    }
  }
} catch (error) {
  console.log(`⚠️  Error checking for PrismaClient instantiation: ${error.message}`);
  hasWarnings = true;
}

// 2. Check for direct imports from '@prisma/client'
console.log('\n2️⃣ Checking for direct PrismaClient imports from @prisma/client...');
try {
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    const tsFiles = findTsFiles(srcDir);
    const problematicFiles = [];
    
    tsFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Allowed files
      if (fileName === 'db-unified.ts') {
        return; // db-unified.ts is allowed to import PrismaClient
      }
      
      if (fileName === 'auth-service.ts') {
        // auth-service.ts is allowed to use "import type"
        if (content.includes('import type { PrismaClient }')) {
          return; // This is OK
        }
      }
      
      // Check for imports from '@prisma/client'
      const importRegex = /import\s+(?:type\s+)?\{[^}]*PrismaClient[^}]*\}\s+from\s+['"]@prisma\/client['"]/g;
      const matches = content.match(importRegex);
      
      if (matches && matches.length > 0) {
        // Check if it's a type-only import
        const isTypeOnly = matches.some(match => match.includes('import type'));
        if (!isTypeOnly) {
          problematicFiles.push({
            file: relativePath,
            matches: matches
          });
        }
      }
    });
    
    if (problematicFiles.length > 0) {
      console.log('❌ Found direct PrismaClient imports (should use @/lib/prisma or @/lib/db instead):');
      problematicFiles.forEach(({ file, matches }) => {
        console.log(`   ${file}`);
        matches.forEach(match => console.log(`      ${match.trim()}`));
      });
      hasErrors = true;
    } else {
      console.log('✅ No problematic PrismaClient imports found');
    }
  }
} catch (error) {
  console.log(`⚠️  Error checking for PrismaClient imports: ${error.message}`);
  hasWarnings = true;
}

// 3. Check for .bak files
console.log('\n3️⃣ Checking for backup files that might be imported...');
try {
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    const backupExtensions = ['.bak', '.old', '.backup'];
    const tsFiles = findTsFiles(srcDir);
    const backupFiles = tsFiles.filter(filePath => {
      path.extname(filePath);
      return backupExtensions.some(backupExt => filePath.includes(backupExt));
    });
    
    if (backupFiles.length > 0) {
      console.log('⚠️  Found backup files that might cause confusion:');
      backupFiles.forEach(file => {
        console.log(`   ${path.relative(process.cwd(), file)}`);
      });
      hasWarnings = true;
    } else {
      console.log('✅ No backup files found');
    }
  }
} catch (error) {
  console.log(`⚠️  Error checking for backup files: ${error.message}`);
  hasWarnings = true;
}

// 4. Verify that db.ts and prisma.ts only re-export
console.log('\n4️⃣ Verifying that db.ts and prisma.ts only re-export...');
const dbPath = path.join(process.cwd(), 'src/lib/db.ts');
const prismaPath = path.join(process.cwd(), 'src/lib/prisma.ts');

[dbPath, prismaPath].forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Remove comments and check for "new PrismaClient" in actual code
    const codeWithoutComments = removeComments(content);
    
    // Check if file contains "new PrismaClient" in actual code (not comments)
    const hasNewPrismaClient = /new\s+PrismaClient\s*\(/.test(codeWithoutComments);
    
    if (hasNewPrismaClient) {
      // Double-check it's not in a string
      const regex = /new\s+PrismaClient\s*\(/g;
      let foundInCode = false;
      let match;
      while ((match = regex.exec(codeWithoutComments)) !== null) {
        const beforeMatch = codeWithoutComments.substring(0, match.index);
        const stringMatches = (beforeMatch.match(/['"`]/g) || []).length;
        if (stringMatches % 2 === 0) {
          foundInCode = true;
          break;
        }
      }
      
      if (foundInCode) {
        console.log(`❌ ${fileName} contains "new PrismaClient" in code - should only re-export!`);
        hasErrors = true;
      } else {
        // It's in a string or comment, which is OK
        if (codeWithoutComments.includes("from './db-unified'") || codeWithoutComments.includes('from "./db-unified"')) {
          console.log(`✅ ${fileName} correctly re-exports from db-unified.ts`);
        } else {
          console.log(`⚠️  ${fileName} might not be re-exporting from db-unified.ts`);
          hasWarnings = true;
        }
      }
    } else {
      // Check if it re-exports from db-unified
      if (content.includes("from './db-unified'") || content.includes('from "./db-unified"')) {
        console.log(`✅ ${fileName} correctly re-exports from db-unified.ts`);
      } else {
        console.log(`⚠️  ${fileName} might not be re-exporting from db-unified.ts`);
        hasWarnings = true;
      }
    }
  } else {
    console.log(`⚠️  ${path.basename(filePath)} not found`);
    hasWarnings = true;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ ERRORS FOUND - Please fix the issues above');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  WARNINGS FOUND - Review the warnings above');
  process.exit(0);
} else {
  console.log('✅ No conflicts found! Database connection setup is correct.');
  process.exit(0);
}
