#!/usr/bin/env tsx
/**
 * Script to check for authentication file conflicts and package conflicts
 * يتحقق من وجود تضارب في ملفات المصادقة ومكتبات المصادقة
 * 
 * Checks for:
 * - Conflicting auth files (auth-server.ts, etc.)
 * - Clerk package (@clerk/nextjs, @clerk/core, etc.)
 * - NextAuth package (next-auth)
 * - Conflicting imports
 * 
 * Usage: npm run check:auth
 *        npm run check:auth-conflicts
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Files that should NOT exist (conflicting files)
const CONFLICTING_FILES = [
  'src/auth-server.ts',
  'src/lib/auth.ts',
  'src/lib/auth-enhanced.ts',
  'src/lib/auth-unified.ts',
];

// Conflicting packages (should NOT be in package.json)
const CONFLICTING_PACKAGES = {
  '@clerk/nextjs': 'Clerk authentication library - conflicts with custom auth',
  '@clerk/core': 'Clerk core library - conflicts with custom auth',
  '@clerk/clerk-react': 'Clerk React library - conflicts with custom auth',
  'next-auth': 'NextAuth library - conflicts with custom auth system',
};

// Forbidden imports that indicate conflicts
const FORBIDDEN_IMPORTS = [
  // Conflicting file imports
  /from ['"]@\/auth-server['"]/,
  /from ['"]\.\.?\/auth-server['"]/,
  /from ['"]@\/lib\/auth['"][^-/]/,
  /from ['"]\.\.?\/lib\/auth['"][^-/]/,
  /from ['"]@\/lib\/auth-enhanced['"]/,
  /from ['"]\.\.?\/lib\/auth-enhanced['"]/,
  /from ['"]@\/lib\/auth-unified['"]/,
  /from ['"]\.\.?\/lib\/auth-unified['"]/,
  /require\(['"]@\/auth-server['"]\)/,
  /require\(['"]@\/lib\/auth-enhanced['"]\)/,
  /require\(['"]@\/lib\/auth-unified['"]\)/,
  // Clerk imports
  /from ['"]@clerk\//,
  /from ['"]@clerk['"]/,
  /require\(['"]@clerk\//,
  /require\(['"]@clerk['"]/,
  /import.*['"]@clerk\//,
  // NextAuth imports
  /from ['"]next-auth['"]/,
  /from ['"]next-auth\/react['"]/,
  /from ['"]next-auth\/client['"]/,
  /require\(['"]next-auth['"]/,
  /require\(['"]next-auth\/react['"]/,
  /import.*['"]next-auth['"]/,
  // Clerk/NextAuth specific components
  /ClerkProvider/,
  /SessionProvider.*from ['"]next-auth/,
];

// Correct import patterns (should be used instead)
const CORRECT_IMPORTS = {
  'auth-server.ts': 'Use @/auth instead (server-side)',
  'lib/auth.ts': 'Use @/lib/auth-service or @/lib/auth/index instead',
  'lib/auth-enhanced.ts': 'Use @/lib/auth-hook-enhanced instead',
  'lib/auth-unified.ts': 'Use @/lib/auth/unified-auth-manager instead',
  '@clerk/nextjs': 'Remove Clerk - use custom auth system (@/lib/auth-service)',
  'next-auth': 'Remove NextAuth - use custom auth system (@/lib/auth-service)',
};

interface ConflictReport {
  conflictingFiles: string[];
  conflictingPackages: Array<{ package: string; reason: string }>;
  forbiddenImports: Array<{ file: string; line: number; import: string; suggestion: string; type: 'file' | 'clerk' | 'nextauth' }>;
  warnings: string[];
}

async function checkAuthConflicts(): Promise<ConflictReport> {
  const report: ConflictReport = {
    conflictingFiles: [],
    conflictingPackages: [],
    forbiddenImports: [],
    warnings: [],
  };

  // Check for conflicting files
  for (const file of CONFLICTING_FILES) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(filePath)) {
      report.conflictingFiles.push(file);
    }
  }

  // Check for conflicting packages in package.json
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
        ...(packageJson.optionalDependencies || {}),
      };

      for (const [pkgName, reason] of Object.entries(CONFLICTING_PACKAGES)) {
        if (allDependencies[pkgName]) {
          report.conflictingPackages.push({
            package: pkgName,
            reason: reason as string,
          });
        }
      }
    } catch (error) {
      report.warnings.push(`Could not read package.json: ${error}`);
    }
  }

  // Find all TypeScript/JavaScript files recursively
  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      // Skip node_modules, dist, build, .next directories
      if (file === 'node_modules' || file === 'dist' || file === 'build' || file === '.next') {
        return;
      }

      if (stat.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        // Include only TypeScript/JavaScript files, exclude .d.ts
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !file.endsWith('.d.ts')) {
          const relativePath = path.relative(SRC_DIR, filePath);
          fileList.push(relativePath);
        }
      }
    });

    return fileList;
  }

  const files = getAllFiles(SRC_DIR);

  // Check for forbidden imports
  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of FORBIDDEN_IMPORTS) {
        if (pattern.test(line)) {
          // Determine which conflict this refers to and its type
          let suggestion = 'Check AUTH_STRUCTURE_CLEAN.md for correct imports';
          let importType: 'file' | 'clerk' | 'nextauth' = 'file';
          
          if (line.includes('@clerk')) {
            importType = 'clerk';
            suggestion = CORRECT_IMPORTS['@clerk/nextjs'];
          } else if (line.includes('next-auth')) {
            importType = 'nextauth';
            suggestion = CORRECT_IMPORTS['next-auth'];
          } else if (line.includes('auth-server')) {
            suggestion = CORRECT_IMPORTS['auth-server.ts'];
          } else if (line.includes('auth-enhanced') && !line.includes('auth-hook-enhanced')) {
            suggestion = CORRECT_IMPORTS['lib/auth-enhanced.ts'];
          } else if (line.includes('auth-unified')) {
            suggestion = CORRECT_IMPORTS['lib/auth-unified.ts'];
          } else if (line.includes("'@/lib/auth'") || line.includes('"@/lib/auth"')) {
            if (!line.includes('auth/') && !line.includes('auth-')) {
              suggestion = CORRECT_IMPORTS['lib/auth.ts'];
            }
          }

          report.forbiddenImports.push({
            file: file,
            line: i + 1,
            import: line.trim(),
            suggestion,
            type: importType,
          });
        }
      }
    }
  }

  return report;
}

function printReport(report: ConflictReport): void {
  console.log('\n🔍 Authentication Conflict Check');
  console.log('🔍 فحص تعارضات المصادقة\n');
  console.log('='.repeat(70));

  let hasConflicts = false;

  // Check conflicting files
  if (report.conflictingFiles.length > 0) {
    hasConflicts = true;
    console.log('\n❌ CONFLICTING FILES FOUND:');
    console.log('   ❌ تم العثور على ملفات متضاربة:');
    console.log('   These files should NOT exist:');
    report.conflictingFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  } else {
    console.log('\n✅ No conflicting files found');
    console.log('   ✅ لم يتم العثور على ملفات متضاربة');
  }

  // Check conflicting packages
  if (report.conflictingPackages.length > 0) {
    hasConflicts = true;
    console.log('\n❌ CONFLICTING PACKAGES FOUND IN package.json:');
    console.log('   ❌ تم العثور على مكتبات متضاربة في package.json:');
    console.log('   These packages should be REMOVED:');
    console.log('   يجب حذف هذه المكتبات:');
    report.conflictingPackages.forEach(({ package: pkg, reason }) => {
      console.log(`   - ${pkg}`);
      console.log(`     Reason: ${reason}`);
      console.log(`     السبب: ${reason}`);
    });
    console.log('\n   💡 To remove, run: npm uninstall <package-name>');
    console.log('   💡 للحذف، شغّل: npm uninstall <package-name>');
  } else {
    console.log('\n✅ No conflicting packages found');
    console.log('   ✅ لم يتم العثور على مكتبات متضاربة');
  }

  // Check forbidden imports
  if (report.forbiddenImports.length > 0) {
    hasConflicts = true;
    console.log('\n❌ FORBIDDEN IMPORTS FOUND:');
    console.log('   ❌ تم العثور على استيرادات محظورة:');
    
    // Group by type
    const clerkImports = report.forbiddenImports.filter(imp => imp.type === 'clerk');
    const nextAuthImports = report.forbiddenImports.filter(imp => imp.type === 'nextauth');
    const fileImports = report.forbiddenImports.filter(imp => imp.type === 'file');

    if (clerkImports.length > 0) {
      console.log('\n   🚫 Clerk imports (Clerk استيرادات):');
      clerkImports.forEach(({ file, line, import: importLine, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${importLine}`);
        console.log(`     💡 ${suggestion}`);
      });
    }

    if (nextAuthImports.length > 0) {
      console.log('\n   🚫 NextAuth imports (NextAuth استيرادات):');
      nextAuthImports.forEach(({ file, line, import: importLine, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${importLine}`);
        console.log(`     💡 ${suggestion}`);
      });
    }

    if (fileImports.length > 0) {
      console.log('\n   🚫 Conflicting file imports (استيرادات ملفات متضاربة):');
      fileImports.forEach(({ file, line, import: importLine, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${importLine}`);
        console.log(`     💡 ${suggestion}`);
      });
    }
  } else {
    console.log('\n✅ No forbidden imports found');
    console.log('   ✅ لم يتم العثور على استيرادات محظورة');
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    report.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  
  if (hasConflicts) {
    console.log('\n⚠️  CONFLICTS DETECTED! Please fix the issues above.');
    console.log('⚠️  تم اكتشاف تعارضات! يرجى إصلاح المشاكل أعلاه.');
    console.log('\n📚 See AUTH_STRUCTURE_CLEAN.md for correct usage.');
    console.log('📚 راجع AUTH_STRUCTURE_CLEAN.md للاستخدام الصحيح.');
    console.log('\n💡 Quick fix suggestions:');
    console.log('💡 اقتراحات الإصلاح السريع:');
    if (report.conflictingPackages.length > 0) {
      const packages = report.conflictingPackages.map(p => p.package).join(' ');
      console.log(`   - npm uninstall ${packages}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ No conflicts detected! Authentication structure is clean.');
    console.log('✅ لم يتم اكتشاف تعارضات! بنية المصادقة نظيفة.');
    process.exit(0);
  }
}

// Run the check
checkAuthConflicts()
  .then(printReport)
  .catch(error => {
    console.error('Error checking auth conflicts:', error);
    process.exit(1);
  });

