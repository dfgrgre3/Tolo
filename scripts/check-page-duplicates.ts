#!/usr/bin/env tsx
/**
 * سكربت للتحقق من ازدواجية ملفات الصفحات (Pages) في Next.js App Router
 * يكتشف الملفات المكررة مثل page-enhanced.tsx, layout-new.tsx, page-new.tsx, page-advanced.tsx
 */

import * as fs from 'fs';
import * as path from 'path';

interface DuplicateFile {
  directory: string;
  files: string[];
  standardFile: string | null;
  duplicateFiles: string[];
  issue: string;
}

interface CheckResult {
  duplicates: DuplicateFile[];
  suspiciousFiles: string[];
  summary: {
    totalDuplicates: number;
    totalSuspicious: number;
  };
}

// الأنماط المشبوهة لأسماء الملفات
const SUSPICIOUS_PATTERNS = [
  /page-enhanced\.tsx?$/i,
  /page-new\.tsx?$/i,
  /page-advanced\.tsx?$/i,
  /page-improved\.tsx?$/i,
  /page-old\.tsx?$/i,
  /page-backup\.tsx?$/i,
  /page-copy\.tsx?$/i,
  /page-v\d+\.tsx?$/i,
  /layout-new\.tsx?$/i,
  /layout-enhanced\.tsx?$/i,
  /layout-improved\.tsx?$/i,
  /layout-old\.tsx?$/i,
  /layout-backup\.tsx?$/i,
  /layout-copy\.tsx?$/i,
  /layout-v\d+\.tsx?$/i,
  /-improved\.tsx?$/i,
  /-enhanced\.tsx?$/i,
  /-new\.tsx?$/i,
  /-old\.tsx?$/i,
  /-backup\.tsx?$/i,
  /-copy\.tsx?$/i,
  /-v2\.tsx?$/i,
  /-v\d+\.tsx?$/i,
  /\.bak\.tsx?$/i,
  /\.old\.tsx?$/i,
];

// أسماء الملفات القياسية في Next.js App Router
const STANDARD_PAGE_FILES = ['page.ts', 'page.tsx', 'layout.ts', 'layout.tsx'];

/**
 * البحث عن الملفات المشبوهة في مجلد app
 */
function findSuspiciousFiles(appDir: string): string[] {
  const suspiciousFiles: string[] = [];

  function scanDirectory(dir: string, relativePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = relativePath 
        ? path.join(relativePath, entry.name).replace(/\\/g, '/')
        : entry.name;

      if (entry.isDirectory()) {
        // تخطي node_modules و .next
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
          continue;
        }
        scanDirectory(fullPath, relativeFilePath);
      } else if (entry.isFile()) {
        // التحقق من الأنماط المشبوهة
        const isSuspicious = SUSPICIOUS_PATTERNS.some(pattern => pattern.test(entry.name));
        if (isSuspicious) {
          suspiciousFiles.push(relativeFilePath);
        }
      }
    }
  }

  scanDirectory(appDir);
  return suspiciousFiles;
}

/**
 * اكتشاف الملفات المكررة في نفس المجلد
 */
function detectDuplicates(appDir: string): DuplicateFile[] {
  const duplicates: DuplicateFile[] = [];

  function scanDirectory(dir: string, relativePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const pageFiles: string[] = [];
    const layoutFiles: string[] = [];
    const otherPageFiles: string[] = [];
    const otherLayoutFiles: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const fileName = entry.name.toLowerCase();
        
        // ملفات page القياسية
        if (fileName === 'page.ts' || fileName === 'page.tsx') {
          pageFiles.push(entry.name);
        }
        // ملفات layout القياسية
        else if (fileName === 'layout.ts' || fileName === 'layout.tsx') {
          layoutFiles.push(entry.name);
        }
        // ملفات page مشبوهة (مثل page-enhanced.tsx)
        else if (fileName.startsWith('page-') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
          otherPageFiles.push(entry.name);
        }
        // ملفات layout مشبوهة (مثل layout-new.tsx)
        else if (fileName.startsWith('layout-') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
          otherLayoutFiles.push(entry.name);
        }
      }
    }

    // التحقق من ازدواجية ملفات page
    if (pageFiles.length > 0 && otherPageFiles.length > 0) {
      duplicates.push({
        directory: relativePath || 'app',
        files: [...pageFiles, ...otherPageFiles],
        standardFile: pageFiles[0],
        duplicateFiles: otherPageFiles,
        issue: `Found standard page.tsx alongside duplicate page files: ${otherPageFiles.join(', ')}`,
      });
    }

    // التحقق من ازدواجية ملفات layout
    if (layoutFiles.length > 0 && otherLayoutFiles.length > 0) {
      duplicates.push({
        directory: relativePath || 'app',
        files: [...layoutFiles, ...otherLayoutFiles],
        standardFile: layoutFiles[0],
        duplicateFiles: otherLayoutFiles,
        issue: `Found standard layout.tsx alongside duplicate layout files: ${otherLayoutFiles.join(', ')}`,
      });
    }

    // التحقق من وجود ملفات page متعددة بدون ملف قياسي
    if (pageFiles.length === 0 && otherPageFiles.length > 1) {
      duplicates.push({
        directory: relativePath || 'app',
        files: otherPageFiles,
        standardFile: null,
        duplicateFiles: otherPageFiles,
        issue: `Found multiple duplicate page files without a standard page.tsx: ${otherPageFiles.join(', ')}`,
      });
    }

    // التحقق من وجود ملفات layout متعددة بدون ملف قياسي
    if (layoutFiles.length === 0 && otherLayoutFiles.length > 1) {
      duplicates.push({
        directory: relativePath || 'app',
        files: otherLayoutFiles,
        standardFile: null,
        duplicateFiles: otherLayoutFiles,
        issue: `Found multiple duplicate layout files without a standard layout.tsx: ${otherLayoutFiles.join(', ')}`,
      });
    }
  }

  function scanRecursive(dir: string, relativePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    scanDirectory(dir, relativePath);

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // تخطي node_modules و .next
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
          continue;
        }
        const newRelativePath = relativePath 
          ? `${relativePath}/${entry.name}` 
          : entry.name;
        scanRecursive(path.join(dir, entry.name), newRelativePath);
      }
    }
  }

  scanRecursive(appDir);
  return duplicates;
}

/**
 * الوظيفة الرئيسية
 */
function checkPageDuplicates(): CheckResult {
  const appDir = path.join(process.cwd(), 'src', 'app');

  if (!fs.existsSync(appDir)) {
    console.error('❌ مجلد app غير موجود:', appDir);
    process.exit(1);
  }

  console.log('🔍 بدء فحص ملفات الصفحات (Pages) في App Router...\n');

  // 1. اكتشاف الملفات المكررة
  const duplicates = detectDuplicates(appDir);
  console.log(`✓ تم فحص ازدواجية الملفات`);

  // 2. اكتشاف الملفات المشبوهة
  const suspiciousFiles = findSuspiciousFiles(appDir);
  console.log(`✓ تم فحص الملفات المشبوهة\n`);

  return {
    duplicates,
    suspiciousFiles,
    summary: {
      totalDuplicates: duplicates.length,
      totalSuspicious: suspiciousFiles.length,
    },
  };
}

/**
 * طباعة التقرير
 */
function printReport(result: CheckResult) {
  console.log('='.repeat(80));
  console.log('📊 تقرير فحص ازدواجية ملفات الصفحات (Pages)');
  console.log('='.repeat(80));
  console.log();

  // ملخص
  console.log('📈 الملخص:');
  console.log(`   • الملفات المكررة: ${result.summary.totalDuplicates}`);
  console.log(`   • الملفات المشبوهة: ${result.summary.totalSuspicious}`);
  console.log();

  // الملفات المكررة
  if (result.duplicates.length > 0) {
    console.log('⚠️  الملفات المكررة:');
    console.log('-'.repeat(80));
    result.duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. المجلد: src/app/${dup.directory}`);
      console.log(`   المشكلة: ${dup.issue}`);
      if (dup.standardFile) {
        console.log(`   ✅ الملف القياسي: ${dup.standardFile}`);
      }
      console.log(`   ❌ الملفات المكررة (يجب حذفها):`);
      dup.duplicateFiles.forEach(file => {
        console.log(`      - ${file}`);
      });
    });
    console.log();
  }

  // الملفات المشبوهة
  if (result.suspiciousFiles.length > 0) {
    console.log('🔍 الملفات المشبوهة (تحتوي على أنماط مثل -enhanced, -new, -advanced):');
    console.log('-'.repeat(80));
    result.suspiciousFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. src/app/${file}`);
    });
    console.log();
  }

  // النتيجة النهائية
  console.log('='.repeat(80));
  if (result.summary.totalDuplicates === 0 && result.summary.totalSuspicious === 0) {
    console.log('✅ لا توجد مشاكل مكتشفة!');
  } else {
    console.log('❌ تم اكتشاف مشاكل تحتاج إلى معالجة');
    console.log('\n💡 التوصيات:');
    console.log('   1. Next.js يستخدم فقط الملفات القياسية (page.tsx, layout.tsx)');
    console.log('   2. احذف جميع الملفات المكررة (page-enhanced.tsx, layout-new.tsx, etc.)');
    console.log('   3. إذا كان لديك محتوى مهم في الملفات المكررة، انقله إلى الملف القياسي');
    console.log('   4. الملفات المكررة تزيد حجم المشروع وتشتت المطورين');
    console.log('\n📝 لتنظيف الملفات تلقائياً، استخدم:');
    console.log('   npm run clean:page-duplicates');
  }
  console.log('='.repeat(80));
}

// تشغيل الفحص
if (require.main === module) {
  try {
    const result = checkPageDuplicates();
    printReport(result);
    
    // إرجاع كود خروج مناسب
    if (result.summary.totalDuplicates > 0 || result.summary.totalSuspicious > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ حدث خطأ أثناء الفحص:', error);
    process.exit(1);
  }
}

export { checkPageDuplicates, printReport };

