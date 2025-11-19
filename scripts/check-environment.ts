#!/usr/bin/env tsx
/**
 * Comprehensive Environment & Prisma Check Script
 * سكربت شامل للتحقق من بيئة التشغيل و Prisma
 * 
 * Checks for:
 * - Prisma EPERM issues (Windows-specific)
 * - Authentication library conflicts (Clerk, NextAuth)
 * - Missing dependencies
 * - Configuration issues
 * 
 * Usage: npm run check:env
 *        tsx scripts/check-environment.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.join(__dirname, '..');

interface EnvironmentReport {
  prisma: {
    schemaExists: boolean;
    clientGenerated: boolean;
    cacheExists: boolean;
    issues: string[];
  };
  auth: {
    conflictingPackages: Array<{ package: string; reason: string }>;
    conflictingFiles: string[];
    forbiddenImports: Array<{ file: string; line: number; import: string; type: string }>;
  };
  windows: {
    isWindows: boolean;
    prismaLocked: boolean;
    nodeProcesses: number;
  };
  errors: string[];
  warnings: string[];
}

const CONFLICTING_AUTH_PACKAGES = {
  '@clerk/nextjs': 'Clerk authentication library - conflicts with custom auth',
  '@clerk/core': 'Clerk core library - conflicts with custom auth',
  '@clerk/clerk-react': 'Clerk React library - conflicts with custom auth',
  'next-auth': 'NextAuth library - conflicts with custom auth system',
};

const CONFLICTING_AUTH_FILES = [
  'src/auth-server.ts',
  'src/lib/auth.ts',
  'src/lib/auth-enhanced.ts',
  'src/lib/auth-unified.ts',
];

async function checkEnvironment(): Promise<EnvironmentReport> {
  const report: EnvironmentReport = {
    prisma: {
      schemaExists: false,
      clientGenerated: false,
      cacheExists: false,
      issues: [],
    },
    auth: {
      conflictingPackages: [],
      conflictingFiles: [],
      forbiddenImports: [],
    },
    windows: {
      isWindows: process.platform === 'win32',
      prismaLocked: false,
      nodeProcesses: 0,
    },
    errors: [],
    warnings: [],
  };

  // Check Prisma
  const schemaPath = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');
  report.prisma.schemaExists = fs.existsSync(schemaPath);
  
  if (!report.prisma.schemaExists) {
    report.errors.push('Prisma schema not found at prisma/schema.prisma');
  }

  const prismaClientPath = path.join(PROJECT_ROOT, 'node_modules', '.prisma');
  report.prisma.cacheExists = fs.existsSync(prismaClientPath);

  const prismaClientGeneratedPath = path.join(
    PROJECT_ROOT,
    'node_modules',
    '@prisma',
    'client',
    'index.js'
  );
  report.prisma.clientGenerated = fs.existsSync(prismaClientGeneratedPath);

  if (!report.prisma.clientGenerated) {
    report.prisma.issues.push('Prisma Client not generated. Run: npm run fix:prisma');
  }

  // Check Windows-specific Prisma issues
  if (report.windows.isWindows) {
    try {
      // Try to check if Prisma files are locked
      if (report.prisma.cacheExists) {
        try {
          fs.accessSync(prismaClientPath, fs.constants.W_OK);
        } catch {
          report.windows.prismaLocked = true;
          report.prisma.issues.push(
            'Prisma cache is locked (EPERM error). Run: npm run fix:prisma'
          );
        }
      }

      // Check for Node processes (Windows-specific)
      try {
        const output = execSync('tasklist /FI "IMAGENAME eq node.exe" 2>nul', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const lines = output.split('\n').filter(line => line.includes('node.exe'));
        report.windows.nodeProcesses = lines.length - 1; // Subtract header

        if (report.windows.nodeProcesses > 0) {
          report.warnings.push(
            `Found ${report.windows.nodeProcesses} Node.js process(es) running. This may cause Prisma EPERM errors.`
          );
        }
      } catch {
        // tasklist command failed, ignore
      }
    } catch (error) {
      report.warnings.push(`Could not check Windows-specific issues: ${error}`);
    }
  }

  // Check authentication packages
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
        ...(packageJson.optionalDependencies || {}),
      };

      for (const [pkgName, reason] of Object.entries(CONFLICTING_AUTH_PACKAGES)) {
        if (allDependencies[pkgName]) {
          report.auth.conflictingPackages.push({
            package: pkgName,
            reason: reason as string,
          });
        }
      }
    } catch (error) {
      report.errors.push(`Could not read package.json: ${error}`);
    }
  }

  // Check conflicting auth files
  for (const file of CONFLICTING_AUTH_FILES) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(filePath)) {
      report.auth.conflictingFiles.push(file);
    }
  }

  // Check for forbidden imports in source files
  const srcDir = path.join(PROJECT_ROOT, 'src');
  if (fs.existsSync(srcDir)) {
    const forbiddenPatterns = [
      { pattern: /from ['"]@clerk\//, type: 'clerk' },
      { pattern: /from ['"]next-auth['"]/, type: 'nextauth' },
      { pattern: /ClerkProvider/, type: 'clerk' },
      { pattern: /SessionProvider.*from ['"]next-auth/, type: 'nextauth' },
    ];

    function getAllFiles(dir: string, fileList: string[] = []): string[] {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (file === 'node_modules' || file === '.next') {
          return;
        }

        if (stat.isDirectory()) {
          getAllFiles(filePath, fileList);
        } else if (stat.isFile()) {
          const ext = path.extname(file);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !file.endsWith('.d.ts')) {
            fileList.push(filePath);
          }
        }
      });

      return fileList;
    }

    const files = getAllFiles(srcDir);
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(PROJECT_ROOT, filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, type } of forbiddenPatterns) {
          if (pattern.test(line)) {
            report.auth.forbiddenImports.push({
              file: relativePath,
              line: i + 1,
              import: line.trim(),
              type,
            });
          }
        }
      }
    }
  }

  return report;
}

function printReport(report: EnvironmentReport): void {
  console.log('\n🔍 Comprehensive Environment & Prisma Check');
  console.log('🔍 فحص شامل لبيئة التشغيل و Prisma\n');
  console.log('='.repeat(70));

  let hasIssues = false;

  // Prisma Section
  console.log('\n📦 Prisma Status:');
  console.log(`   Schema exists: ${report.prisma.schemaExists ? '✅' : '❌'}`);
  console.log(`   Client generated: ${report.prisma.clientGenerated ? '✅' : '❌'}`);
  console.log(`   Cache exists: ${report.prisma.cacheExists ? '✅' : '❌'}`);

  if (report.prisma.issues.length > 0) {
    hasIssues = true;
    console.log('\n   ⚠️  Issues:');
    report.prisma.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }

  // Windows Section
  if (report.windows.isWindows) {
    console.log('\n🪟 Windows Environment:');
    console.log(`   Node processes running: ${report.windows.nodeProcesses}`);
    console.log(`   Prisma locked: ${report.windows.prismaLocked ? '⚠️  Yes' : '✅ No'}`);
    
    if (report.windows.nodeProcesses > 0 || report.windows.prismaLocked) {
      hasIssues = true;
      console.log('\n   💡 Solution: Run `npm run fix:prisma` to stop Node processes and fix Prisma EPERM');
    }
  }

  // Auth Section
  console.log('\n🔐 Authentication Libraries:');
  
  if (report.auth.conflictingPackages.length > 0) {
    hasIssues = true;
    console.log('\n   ❌ Conflicting packages found:');
    report.auth.conflictingPackages.forEach(({ package: pkg, reason }) => {
      console.log(`      - ${pkg}`);
      console.log(`        ${reason}`);
    });
    console.log('\n   💡 Solution: Remove conflicting packages');
    const packages = report.auth.conflictingPackages.map(p => p.package).join(' ');
    console.log(`      npm uninstall ${packages}`);
  } else {
    console.log('   ✅ No conflicting packages');
  }

  if (report.auth.conflictingFiles.length > 0) {
    hasIssues = true;
    console.log('\n   ❌ Conflicting files found:');
    report.auth.conflictingFiles.forEach(file => {
      console.log(`      - ${file}`);
    });
  }

  if (report.auth.forbiddenImports.length > 0) {
    hasIssues = true;
    console.log('\n   ❌ Forbidden imports found:');
    const grouped = report.auth.forbiddenImports.reduce((acc, imp) => {
      if (!acc[imp.type]) acc[imp.type] = [];
      acc[imp.type].push(imp);
      return acc;
    }, {} as Record<string, typeof report.auth.forbiddenImports>);

    for (const [type, imports] of Object.entries(grouped)) {
      console.log(`\n      ${type.toUpperCase()}:`);
      imports.forEach(({ file, line, import: importLine }) => {
        console.log(`        - ${file}:${line}`);
        console.log(`          ${importLine}`);
      });
    }
  }

  if (report.auth.conflictingPackages.length === 0 && 
      report.auth.conflictingFiles.length === 0 && 
      report.auth.forbiddenImports.length === 0) {
    console.log('   ✅ No authentication conflicts');
  }

  // Errors
  if (report.errors.length > 0) {
    hasIssues = true;
    console.log('\n❌ Errors:');
    report.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    report.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  
  if (hasIssues) {
    console.log('\n⚠️  ISSUES DETECTED! Please fix the issues above.');
    console.log('⚠️  تم اكتشاف مشاكل! يرجى إصلاح المشاكل أعلاه.\n');
    console.log('💡 Quick fixes:');
    console.log('💡 إصلاحات سريعة:');
    console.log('   - For Prisma EPERM: npm run fix:prisma');
    console.log('     لإصلاح Prisma EPERM: npm run fix:prisma');
    if (report.auth.conflictingPackages.length > 0) {
      const packages = report.auth.conflictingPackages.map(p => p.package).join(' ');
      console.log(`   - Remove auth conflicts: npm uninstall ${packages}`);
      console.log(`     لحذف تعارضات المصادقة: npm uninstall ${packages}`);
    }
    console.log('\n   For more details: npm run check:auth');
    console.log('   لمزيد من التفاصيل: npm run check:auth');
    process.exit(1);
  } else {
    console.log('\n✅ All checks passed! Environment is healthy.');
    console.log('✅ نجحت جميع الفحوصات! بيئة التشغيل سليمة.');
    process.exit(0);
  }
}

// Run the check
checkEnvironment()
  .then(printReport)
  .catch(error => {
    console.error('Error checking environment:', error);
    process.exit(1);
  });

