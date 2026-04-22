#!/usr/bin/env tsx
/**
 * سكريبت شامل لاكتشاف جميع الأخطاء في المشروع
 * يفحص: TypeScript errors, ESLint errors, missing imports, type errors, وغيرها
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

interface ErrorReport {
  type: 'typescript' | 'eslint' | 'missing-import' | 'type-error' | 'console-usage' | 'any-usage' | 'syntax';
  severity: 'critical' | 'warning' | 'info';
  file: string;
  line?: number;
  column?: number;
  message: string;
  description?: string;
  fix?: string;
}

const errors: ErrorReport[] = [];
const srcDir = join(process.cwd(), 'src');
const rootDir = process.cwd();

function logError(report: ErrorReport) {
  errors.push(report);
  console.error(`[${report.severity.toUpperCase()}] ${report.type}: ${report.file}${report.line ? `:${report.line}` : ''} - ${report.message}`);
}

/**
 * فحص أخطاء TypeScript
 */
function checkTypeScriptErrors(): void {
  console.log('🔍 فحص أخطاء TypeScript...');
  try {
    const output = execSync('npx tsc --noEmit --pretty 2>&1', {
      encoding: 'utf-8',
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (output) {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('error TS')) {
          const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s+error TS\d+:\s+(.+)$/);
          if (match) {
            const [, file, lineNum, colNum, message] = match;
            logError({
              type: 'typescript',
              severity: 'critical',
              file: file.trim(),
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message: message.trim(),
              description: 'خطأ في TypeScript يمنع التجميع',
            });
          }
        }
      }
    }
  } catch (error: any) {
    // TypeScript errors are expected if there are compilation errors
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    if (output) {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('error TS')) {
          const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s+error TS\d+:\s+(.+)$/);
          if (match) {
            const [, file, lineNum, colNum, message] = match;
            logError({
              type: 'typescript',
              severity: 'critical',
              file: file.trim(),
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message: message.trim(),
              description: 'خطأ في TypeScript يمنع التجميع',
            });
          }
        }
      }
    }
  }
}

/**
 * فحص استخدام `any` type
 */
function checkAnyUsage(filePath: string, content: string): void {
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Check for `: any`, `as any`, `any[]`, etc.
    if (
      line.includes(': any') ||
      line.includes('as any') ||
      line.match(/\bany\s*[|&]/) ||
      line.match(/[|&]\s*any\b/)
    ) {
      // Skip if it's a comment
      if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        logError({
          type: 'any-usage',
          severity: 'warning',
          file: filePath,
          line: index + 1,
          message: `استخدام \`any\` type - يجب استبداله بنوع محدد`,
          description: 'استخدام `any` يقلل من فائدة TypeScript',
          fix: 'استبدل `any` بنوع محدد أو type guard',
        });
      }
    }
  });
}

/**
 * فحص استخدام console.log/warn/error في الكود الإنتاجي
 */
function checkConsoleUsage(filePath: string, content: string): void {
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (
      line.includes('console.log') ||
      line.includes('console.warn') ||
      line.includes('console.error')
    ) {
      // Skip if it's a comment or in test files
      if (
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('*') &&
        !filePath.includes('test') &&
        !filePath.includes('spec') &&
        !filePath.includes('mock')
      ) {
        // Check if it's intentionally for debugging
        const isDebugOnly = line.includes('NODE_ENV') || line.includes('development');
        
        logError({
          type: 'console-usage',
          severity: isDebugOnly ? 'info' : 'warning',
          file: filePath,
          line: index + 1,
          message: `استخدام console.${line.match(/console\.(\w+)/)?.[1] || 'log'} في الكود`,
          description: isDebugOnly 
            ? 'يستخدم console فقط في وضع التطوير'
            : 'يجب استخدام logger بدلاً من console في الكود الإنتاجي',
          fix: 'استبدل console.* بـ logger من @/lib/logger',
        });
      }
    }
  });
}

/**
 * فحص الواردات المفقودة
 */
function checkMissingImports(filePath: string, content: string): void {
  // Check for common patterns that might indicate missing imports
  const lines = content.split('\n');
  const imports = new Set<string>();
  
  // Collect all imports
  lines.forEach((line) => {
    if (line.trim().startsWith('import ')) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        imports.add(match[1]);
      }
    }
  });

  // Check for usage of common Next.js/React APIs without imports
  if (content.includes('useRouter') && !content.includes('from') && !content.includes('use-router')) {
    const hasImport = Array.from(imports).some(imp => imp.includes('next/navigation') || imp.includes('next/router'));
    if (!hasImport) {
      logError({
        type: 'missing-import',
        severity: 'critical',
        file: filePath,
        message: 'استخدام useRouter بدون استيراد',
        description: 'يستخدم useRouter ولكن لا يوجد import له',
        fix: 'أضف: import { useRouter } from \'next/navigation\'',
      });
    }
  }
}

/**
 * فحص الملفات بشكل متكرر
 */
function scanFiles(dir: string, extensions: string[] = ['.ts', '.tsx']): void {
  try {
    const files = readdirSync(dir);
    
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(file)) {
          scanFiles(filePath, extensions);
        }
      } else if (stat.isFile()) {
        const ext = extname(file);
        if (extensions.includes(ext)) {
          try {
            const content = readFileSync(filePath, 'utf-8');
            const relativePath = filePath.replace(rootDir + '\\', '').replace(rootDir + '/', '');
            
            checkAnyUsage(relativePath, content);
            checkConsoleUsage(relativePath, content);
            checkMissingImports(relativePath, content);
          } catch (_error) {
            // Skip files that can't be read
          }
        }
      }
    }
  } catch (_error) {
    // Skip directories that can't be read
  }
}

/**
 * فحص ESLint errors (باستثناء node_modules)
 */
function checkESLintErrors(): void {
  console.log('🔍 فحص أخطاء ESLint...');
  try {
    const output = execSync('npm run lint 2>&1', {
      encoding: 'utf-8',
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (output) {
      const lines = output.split('\n');
      for (const line of lines) {
        // Skip node_modules and external packages
        if (line.includes('node_modules') || line.includes('.venv')) {
          continue;
        }

        const match = line.match(/^([^\s]+)\s+(\d+):(\d+)\s+error\s+(.+)$/);
        if (match) {
          const [, file, lineNum, colNum, message] = match;
          // Only report errors in src directory
          if (file.includes('src') || file.startsWith('src')) {
            logError({
              type: 'eslint',
              severity: 'warning',
              file: file.trim(),
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message: message.trim(),
              description: 'خطأ في ESLint - يجب إصلاحه لضمان جودة الكود',
            });
          }
        }
      }
    }
  } catch (error: any) {
    // ESLint errors are expected if there are linting errors
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    if (output) {
      const lines = output.split('\n');
      for (const line of lines) {
        // Skip node_modules and external packages
        if (line.includes('node_modules') || line.includes('.venv')) {
          continue;
        }

        const match = line.match(/^([^\s]+)\s+(\d+):(\d+)\s+error\s+(.+)$/);
        if (match) {
          const [, file, lineNum, colNum, message] = match;
          // Only report errors in src directory
          if (file.includes('src') || file.startsWith('src')) {
            logError({
              type: 'eslint',
              severity: 'warning',
              file: file.trim(),
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message: message.trim(),
              description: 'خطأ في ESLint - يجب إصلاحه لضمان جودة الكود',
            });
          }
        }
      }
    }
  }
}

/**
 * إنشاء تقرير شامل
 */
function generateReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 تقرير شامل لاكتشاف الأخطاء');
  console.log('='.repeat(80) + '\n');

  const critical = errors.filter(e => e.severity === 'critical');
  const warnings = errors.filter(e => e.severity === 'warning');
  const info = errors.filter(e => e.severity === 'info');

  console.log(`\n📈 الإحصائيات:`);
  console.log(`  - إجمالي الأخطاء الحرجة: ${critical.length}`);
  console.log(`  - إجمالي التحذيرات: ${warnings.length}`);
  console.log(`  - معلومات: ${info.length}`);
  console.log(`  - الإجمالي: ${errors.length}\n`);

  if (critical.length > 0) {
    console.log('\n🔴 الأخطاء الحرجة (Critical):');
    console.log('-'.repeat(80));
    critical.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.type.toUpperCase()}`);
      console.log(`   الملف: ${error.file}${error.line ? `:${error.line}${error.column ? `:${error.column}` : ''}` : ''}`);
      console.log(`   الرسالة: ${error.message}`);
      if (error.description) {
        console.log(`   الوصف: ${error.description}`);
      }
      if (error.fix) {
        console.log(`   الإصلاح المقترح: ${error.fix}`);
      }
    });
  }

  if (warnings.length > 0) {
    console.log('\n\n⚠️  التحذيرات (Warnings):');
    console.log('-'.repeat(80));
    warnings.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.type.toUpperCase()}`);
      console.log(`   الملف: ${error.file}${error.line ? `:${error.line}` : ''}`);
      console.log(`   الرسالة: ${error.message}`);
      if (error.description) {
        console.log(`   الوصف: ${error.description}`);
      }
    });
  }

  // Group by file
  const byFile = new Map<string, ErrorReport[]>();
  errors.forEach(error => {
    if (!byFile.has(error.file)) {
      byFile.set(error.file, []);
    }
    byFile.get(error.file)!.push(error);
  });

  console.log('\n\n📂 الأخطاء حسب الملف:');
  console.log('-'.repeat(80));
  Array.from(byFile.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([file, fileErrors]) => {
      const criticalCount = fileErrors.filter(e => e.severity === 'critical').length;
      const warningCount = fileErrors.filter(e => e.severity === 'warning').length;
      console.log(`\n${file} (${fileErrors.length} خطأ - ${criticalCount} حرج, ${warningCount} تحذير)`);
      fileErrors.forEach(error => {
        console.log(`  [${error.severity}] ${error.type}: ${error.message}${error.line ? ` (السطر ${error.line})` : ''}`);
      });
    });

  console.log('\n' + '='.repeat(80));
  
  // Save report to file
  const reportPath = join(rootDir, 'COMPREHENSIVE_ERROR_REPORT.md');
  let reportContent = `# تقرير شامل لاكتشاف الأخطاء في المشروع\n\n`;
  reportContent += `**تاريخ الفحص:** ${new Date().toLocaleString('ar-SA')}\n\n`;
  reportContent += `## 📊 الإحصائيات\n\n`;
  reportContent += `- **إجمالي الأخطاء الحرجة:** ${critical.length}\n`;
  reportContent += `- **إجمالي التحذيرات:** ${warnings.length}\n`;
  reportContent += `- **إجمالي المعلومات:** ${info.length}\n`;
  reportContent += `- **الإجمالي:** ${errors.length}\n\n`;

  if (critical.length > 0) {
    reportContent += `## 🔴 الأخطاء الحرجة (Critical)\n\n`;
    critical.forEach((error, index) => {
      reportContent += `### خطأ ${index + 1}: ${error.type}\n\n`;
      reportContent += `**الملف:** \`${error.file}\`${error.line ? `:${error.line}` : ''}\n\n`;
      reportContent += `**الرسالة:** ${error.message}\n\n`;
      if (error.description) {
        reportContent += `**الوصف:** ${error.description}\n\n`;
      }
      if (error.fix) {
        reportContent += `**الإصلاح المقترح:** ${error.fix}\n\n`;
      }
      reportContent += `---\n\n`;
    });
  }

  if (warnings.length > 0) {
    reportContent += `## ⚠️  التحذيرات (Warnings)\n\n`;
    warnings.forEach((error, index) => {
      reportContent += `### تحذير ${index + 1}: ${error.type}\n\n`;
      reportContent += `**الملف:** \`${error.file}\`${error.line ? `:${error.line}` : ''}\n\n`;
      reportContent += `**الرسالة:** ${error.message}\n\n`;
      if (error.description) {
        reportContent += `**الوصف:** ${error.description}\n\n`;
      }
      reportContent += `---\n\n`;
    });
  }

  reportContent += `## 📂 الأخطاء حسب الملف\n\n`;
  Array.from(byFile.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([file, fileErrors]) => {
      const criticalCount = fileErrors.filter(e => e.severity === 'critical').length;
      const warningCount = fileErrors.filter(e => e.severity === 'warning').length;
      reportContent += `### ${file}\n\n`;
      reportContent += `**عدد الأخطاء:** ${fileErrors.length} (${criticalCount} حرج, ${warningCount} تحذير)\n\n`;
      fileErrors.forEach(error => {
        reportContent += `- [${error.severity}] **${error.type}**: ${error.message}${error.line ? ` (السطر ${error.line})` : ''}\n`;
      });
      reportContent += `\n`;
    });

  reportContent += `\n---\n\n`;
  reportContent += `**تم إنشاء التقرير بواسطة:** Comprehensive Error Check Script\n`;
  reportContent += `**التاريخ:** ${new Date().toLocaleString('ar-SA')}\n`;

  try {
    writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`\n✅ تم حفظ التقرير في: ${reportPath}`);
  } catch (error) {
    console.error(`\n❌ فشل حفظ التقرير: ${error}`);
  }

  // Exit with error code if there are critical errors
  if (critical.length > 0) {
    console.log('\n❌ تم العثور على أخطاء حرجة!');
    process.exit(1);
  } else {
    console.log('\n✅ لا توجد أخطاء حرجة!');
    process.exit(0);
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  console.log('🚀 بدء الفحص الشامل للمشروع...\n');

  // 1. فحص TypeScript errors
  checkTypeScriptErrors();

  // 2. فحص ESLint errors (باستثناء node_modules)
  checkESLintErrors();

  // 3. فحص الملفات في src
  console.log('🔍 فحص الملفات في src...');
  scanFiles(srcDir);

  // 4. إنشاء التقرير
  generateReport();
}

// تشغيل السكريبت
main().catch((error) => {
  console.error('❌ حدث خطأ أثناء الفحص:', error);
  process.exit(1);
});
