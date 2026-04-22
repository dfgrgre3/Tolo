#!/usr/bin/env node

/**
 * Script to check for database connection conflicts
 * ظٹطھط­ظ‚ظ‚ ظ…ظ† طھط¶ط§ط±ط¨ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
 * 
 * Usage: node scripts/check-db-conflicts.js
 */

const fs = require('fs');
const path = require('path');

console.log('ًں”چ Checking for database connection conflicts...\n');

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
console.log('1ï¸ڈâƒ£ Checking for direct PrismaClient instantiation...');
try {
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    console.log('âڑ ï¸ڈ  src/ directory not found');
    hasWarnings = true;
  } else {
    const tsFiles = findTsFiles(srcDir);
    const problematicFiles = [];
    
    tsFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Skip db.ts (which is now the allowed place to create PrismaClient)
      if (fileName === 'db.ts' && filePath.includes(path.join('src', 'lib'))) {
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
      console.log('â‌Œ Found direct PrismaClient instantiation outside src/lib/db.ts:');
      problematicFiles.forEach(({ file, line }) => {
        console.log(`   ${file}:${line}`);
      });
      hasErrors = true;
    } else {
      console.log('âœ… No problematic PrismaClient instantiation found');
    }
  }
} catch (error) {
  console.log(`âڑ ï¸ڈ  Error checking for PrismaClient instantiation: ${error.message}`);
  hasWarnings = true;
}

// 2. Check for direct imports from '@prisma/client'
console.log('\n2ï¸ڈâƒ£ Checking for direct PrismaClient imports from @prisma/client...');
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
      if (fileName === 'db.ts' && filePath.includes(path.join('src', 'lib'))) {
        return; // src/lib/db.ts is now allowed to import PrismaClient
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
        const isTypeOnly = matches.every(match => match.includes('import type'));
        if (!isTypeOnly) {
          problematicFiles.push({
            file: relativePath,
            matches: matches.filter(match => !match.includes('import type'))
          });
        }
      }
    });
    
    if (problematicFiles.length > 0) {
      console.log('â‌Œ Found direct PrismaClient imports (should use @/lib/db instead):');
      problematicFiles.forEach(({ file, matches }) => {
        console.log(`   ${file}`);
        matches.forEach(match => console.log(`      ${match.trim()}`));
      });
      hasErrors = true;
    } else {
      console.log('âœ… No problematic PrismaClient imports found');
    }
  }
} catch (error) {
  console.log(`âڑ ï¸ڈ  Error checking for PrismaClient imports: ${error.message}`);
  hasWarnings = true;
}

// 3. Check for .bak files
console.log('\n3ï¸ڈâƒ£ Checking for backup files that might be imported...');
try {
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    const backupExtensions = ['.bak', '.old', '.backup'];
    const tsFiles = findTsFiles(srcDir);
    const backupFiles = tsFiles.filter(filePath => {
      return backupExtensions.some(backupExt => filePath.includes(backupExt));
    });
    
    if (backupFiles.length > 0) {
      console.log('âڑ ï¸ڈ  Found backup files that might cause confusion:');
      backupFiles.forEach(file => {
        console.log(`   ${path.relative(process.cwd(), file)}`);
      });
      hasWarnings = true;
    } else {
      console.log('âœ… No backup files found');
    }
  }
} catch (error) {
  console.log(`âڑ ï¸ڈ  Error checking for backup files: ${error.message}`);
  hasWarnings = true;
}

// 4. Verify that db.ts handles the database connection
console.log('\n4ï¸ڈâƒ£ Verifying that db.ts correctly handles the database connection...');
const dbPath = path.join(process.cwd(), 'src/lib/db.ts');

if (fs.existsSync(dbPath)) {
  const content = fs.readFileSync(dbPath, 'utf-8');
  
  // Remove comments and check for "new PrismaClient" in actual code
  const codeWithoutComments = removeComments(content);
  
  // Check if file contains "new PrismaClient" in actual code (not comments)
  const hasNewPrismaClient = /new\s+PrismaClient\s*\(/.test(codeWithoutComments);
  const exportsPrisma = content.includes('export const prisma') || content.includes('export default prisma');
  
  if (hasNewPrismaClient && exportsPrisma) {
    console.log('âœ… src/lib/db.ts is correctly configured as the database entry point.');
  } else if (!hasNewPrismaClient) {
    console.log('â‌Œ src/lib/db.ts missing instantiation "new PrismaClient()"');
    hasErrors = true;
  } else {
    console.log('âڑ ï¸ڈ  src/lib/db.ts might not be exporting the prisma client correctly');
    hasWarnings = true;
  }
} else {
  console.log('â‌Œ src/lib/db.ts not found! This is now required as the unified entry point.');
  hasErrors = true;
}


// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('â‌Œ ERRORS FOUND - Please fix the issues above');
  process.exit(1);
} else if (hasWarnings) {
  console.log('âڑ ï¸ڈ  WARNINGS FOUND - Review the warnings above');
  process.exit(0);
} else {
  console.log('âœ… No conflicts found! Database connection setup is correct.');
  process.exit(0);
}
