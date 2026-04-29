#!/usr/bin/env tsx
/**
 * سكربت للتحقق من ازدواجية ملفات API Routes في Next.js
 * يكتشف الملفات المكررة والمشاكل المحتملة في بنية API Routes
 */

import * as fs from 'fs';
import * as path from 'path';

interface DuplicateFile {
  directory: string;
  files: string[];
  issue: string;
}

interface RouteConflict {
  path: string;
  conflicts: string[];
  severity: 'high' | 'medium' | 'low';
}

interface CheckResult {
  duplicates: DuplicateFile[];
  conflicts: RouteConflict[];
  suspiciousFiles: string[];
  summary: {
    totalDuplicates: number;
    totalConflicts: number;
    totalSuspicious: number;
  };
}

// الأنماط المشبوهة لأسماء الملفات
const SUSPICIOUS_PATTERNS = [
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


/**
 * البحث عن جميع ملفات route في مجلد API
 */
function findRouteFiles(apiDir: string): Map<string, string[]> {
  const routeFiles = new Map<string, string[]>();

  function scanDirectory(dir: string, relativePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath, relativeFilePath);
      } else if (entry.isFile()) {
        // التحقق من ملفات route
        if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
          const dirKey = relativePath || '.';
          if (!routeFiles.has(dirKey)) {
            routeFiles.set(dirKey, []);
          }
          routeFiles.get(dirKey)!.push(relativeFilePath);
        }
      }
    }
  }

  scanDirectory(apiDir);
  return routeFiles;
}

/**
 * البحث عن الملفات المشبوهة
 */
function findSuspiciousFiles(apiDir: string): string[] {
  const suspiciousFiles: string[] = [];

  function scanDirectory(dir: string, relativePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
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

  scanDirectory(apiDir);
  return suspiciousFiles;
}

/**
 * اكتشاف الملفات المكررة في نفس المجلد
 */
function detectDuplicates(routeFiles: Map<string, string[]>): DuplicateFile[] {
  const duplicates: DuplicateFile[] = [];

  for (const [directory, files] of routeFiles.entries()) {
    if (files.length > 1) {
      duplicates.push({
        directory,
        files,
        issue: `Multiple route files found in the same directory: ${files.length} files`,
      });
    }
  }

  return duplicates;
}

/**
 * اكتشاف التضاربات المحتملة في المسارات
 */
function detectConflicts(apiDir: string): RouteConflict[] {
  const conflicts: RouteConflict[] = [];
  const routePaths = new Map<string, string[]>();

  function scanDirectory(dir: string, routePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = routePath ? `${routePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // تخطي المجلدات الديناميكية [id]
        if (!entry.name.startsWith('[')) {
          scanDirectory(fullPath, relativePath);
        }
      } else if (entry.isFile()) {
        if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
          const normalizedPath = routePath.replace(/\\/g, '/');
          if (!routePaths.has(normalizedPath)) {
            routePaths.set(normalizedPath, []);
          }
          routePaths.get(normalizedPath)!.push(fullPath);
        }
      }
    }
  }

  scanDirectory(apiDir);

  // البحث عن مسارات متشابهة قد تسبب تضارباً
  // ملاحظة: المسارات المتداخلة في Next.js مسموحة (مثل /api/auth و /api/auth/login)
  // نحن نبحث فقط عن المسارات التي قد تكون مكررة أو متشابهة بشكل مشبوه
  const pathArray = Array.from(routePaths.keys());
  for (let i = 0; i < pathArray.length; i++) {
    for (let j = i + 1; j < pathArray.length; j++) {
      const path1 = pathArray[i];
      const path2 = pathArray[j];

      // التحقق من المسارات المتشابهة (تجاهل المسارات المتداخلة الصحيحة)
      if (arePathsConflicting(path1, path2)) {
        // تجاهل المسارات المتداخلة الصحيحة في Next.js
        // مثل: /api/auth و /api/auth/login (هذا مسموح)
        const isNestedRoute = path1.startsWith(path2 + '/') || path2.startsWith(path1 + '/');
        if (!isNestedRoute) {
          conflicts.push({
            path: path1,
            conflicts: [path2],
            severity: 'high',
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * التحقق من وجود تضارب حقيقي بين مسارين
 * في Next.js، المسارات المتداخلة مسموحة (مثل: /api/auth و /api/auth/login)
 * التضارب الحقيقي يحدث فقط عندما يكون هناك ملفان route.ts في نفس المجلد
 */
function arePathsConflicting(path1: string, path2: string): boolean {
  // مسارات متطابقة تماماً - هذا تضارب حقيقي
  if (path1 === path2) {
    return true;
  }

  // مسارات متشابهة جداً (مثل: users/register و users/register-improved)
  // هذا يشير إلى وجود ملفات مكررة بأسماء مختلفة
  const normalized1 = path1.replace(/[-_]/g, '').toLowerCase();
  const normalized2 = path2.replace(/[-_]/g, '').toLowerCase();
  
  // إذا كانت المسارات متطابقة بعد إزالة الشرطات والشرطات السفلية
  if (normalized1 === normalized2) {
    return true;
  }

  // مسارات متشابهة جزئياً قد تشير إلى ازدواجية
  // مثل: "reminders" و "reminders-improved" (إذا كانا في نفس المستوى)
  const parts1 = path1.split('/');
  const parts2 = path2.split('/');
  
  // إذا كانا في نفس المستوى ولهما نفس البادئة
  if (parts1.length === parts2.length && parts1.length > 0) {
    const lastPart1 = parts1[parts1.length - 1].toLowerCase();
    const lastPart2 = parts2[parts2.length - 1].toLowerCase();
    
    // تأكد من أن المسارات متشابهة في الأجزاء السابقة
    const prefix1 = parts1.slice(0, -1).join('/');
    const prefix2 = parts2.slice(0, -1).join('/');
    
    if (prefix1 === prefix2) {
      // إذا كان الجزء الأخير متشابهاً بشكل مشبوه
      // مثل: "reminders" و "reminders-improved"
      const suspiciousPatterns = [
        /^(.+)-improved$/,
        /^(.+)-enhanced$/,
        /^(.+)-new$/,
        /^(.+)-old$/,
        /^(.+)-backup$/,
        /^(.+)-copy$/,
        /^(.+)-v\d+$/,
      ];
      
      for (const pattern of suspiciousPatterns) {
        const match1 = lastPart1.match(pattern);
        const match2 = lastPart2.match(pattern);
        
        if (match1 && match1[1] === lastPart2) return true;
        if (match2 && match2[1] === lastPart1) return true;
        if (match1 && match2 && match1[1] === match2[1]) return true;
      }
      
      // حالة خاصة: جمع بسيط (مثل: session -> sessions)
      // لكن فقط إذا كان الفرق هو حرف 's' فقط في النهاية
      if (lastPart1 + 's' === lastPart2 || lastPart2 + 's' === lastPart1) {
        // هذه قد تكون مسارات صحيحة، لكن نبلغ عنها للتحقق
        return true;
      }
      
      // تجاهل الحالات التي تكون فيها المسارات مختلفة تماماً
      // مثل: "verify" و "verify-login" (هذه مسارات صحيحة)
      if (lastPart1.includes('-') && lastPart2.includes('-')) {
        // إذا كان كلاهما يحتوي على شرطة، فهما مسارات مختلفة
        return false;
      }
    }
  }

  return false;
}

/**
 * التحقق من وجود ملفات route مكررة بجانب بعضها
 */
function checkAdjacentDuplicates(apiDir: string): DuplicateFile[] {
  const duplicates: DuplicateFile[] = [];

  function scanDirectory(dir: string, relativePath: string = '') {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const routeFiles: string[] = [];
    const otherRouteFiles: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
          routeFiles.push(entry.name);
        } else if (entry.name.startsWith('route') && entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          otherRouteFiles.push(entry.name);
        }
      }
    }

    // إذا كان هناك route.ts وملفات route أخرى
    if (routeFiles.length > 0 && otherRouteFiles.length > 0) {
      duplicates.push({
        directory: relativePath || 'api',
        files: [...routeFiles, ...otherRouteFiles],
        issue: `Found route.ts alongside other route files: ${otherRouteFiles.join(', ')}`,
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
        const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        scanRecursive(path.join(dir, entry.name), newRelativePath);
      }
    }
  }

  scanRecursive(apiDir);
  return duplicates;
}

/**
 * الوظيفة الرئيسية
 */
function checkApiDuplicates(): CheckResult {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');

  if (!fs.existsSync(apiDir)) {
    console.error('â‌Œ مجلد API غير موجود:', apiDir);
    process.exit(1);
  }

  console.log('ًں”چ بدء فحص ملفات API Routes...\n');

  // 1. البحث عن ملفات route
  const routeFiles = findRouteFiles(apiDir);
  console.log(`âœ“ تم العثور على ${routeFiles.size} مجلد يحتوي على route files`);

  // 2. اكتشاف الملفات المكررة في نفس المجلد
  const duplicates = detectDuplicates(routeFiles);
  console.log(`âœ“ تم فحص ازدواجية الملفات في نفس المجلد`);

  // 3. اكتشاف الملفات المكررة المجاورة
  const adjacentDuplicates = checkAdjacentDuplicates(apiDir);
  console.log(`âœ“ تم فحص الملفات المجاورة`);

  // 4. اكتشاف الملفات المشبوهة
  const suspiciousFiles = findSuspiciousFiles(apiDir);
  console.log(`âœ“ تم فحص الملفات المشبوهة`);

  // 5. اكتشاف التضاربات
  const conflicts = detectConflicts(apiDir);
  console.log(`âœ“ تم فحص التضاربات المحتملة\n`);

  // دمج جميع الملفات المكررة
  const allDuplicates = [...duplicates, ...adjacentDuplicates];

  return {
    duplicates: allDuplicates,
    conflicts,
    suspiciousFiles,
    summary: {
      totalDuplicates: allDuplicates.length,
      totalConflicts: conflicts.length,
      totalSuspicious: suspiciousFiles.length,
    },
  };
}

/**
 * طباعة التقرير
 */
function printReport(result: CheckResult) {
  console.log('='.repeat(80));
  console.log('ًں“ٹ تقرير فحص ازدواجية ملفات API Routes');
  console.log('='.repeat(80));
  console.log();

  // ملخص
  console.log('ًں“ˆ الملخص:');
  console.log(`   â€¢ الملفات المكررة: ${result.summary.totalDuplicates}`);
  console.log(`   â€¢ التضاربات: ${result.summary.totalConflicts}`);
  console.log(`   â€¢ الملفات المشبوهة: ${result.summary.totalSuspicious}`);
  console.log();

  // الملفات المكررة
  if (result.duplicates.length > 0) {
    console.log('âڑ ï¸ڈ  الملفات المكررة:');
    console.log('-'.repeat(80));
    result.duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. المجلد: ${dup.directory}`);
      console.log(`   المشكلة: ${dup.issue}`);
      console.log(`   الملفات:`);
      dup.files.forEach(file => {
        console.log(`      - ${file}`);
      });
    });
    console.log();
  }

  // الملفات المشبوهة
  if (result.suspiciousFiles.length > 0) {
    console.log('ًں”چ الملفات المشبوهة (تحتوي على أنماط مثل -improved, -enhanced, -new):');
    console.log('-'.repeat(80));
    result.suspiciousFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log();
  }

  // التضاربات
  if (result.conflicts.length > 0) {
    console.log('âڑ، التضاربات المحتملة:');
    console.log('-'.repeat(80));
    console.log('âڑ ï¸ڈ  ملاحظة: بعض هذه التضاربات قد تكون مسارات صحيحة في Next.js.');
    console.log('   راجع كل مسار للتأكد من أنه مطلوب وليس مكرراً.\n');
    result.conflicts.forEach((conflict, index) => {
      console.log(`\n${index + 1}. المسار: ${conflict.path}`);
      console.log(`   الخطورة: ${conflict.severity}`);
      console.log(`   يتعارض مع:`);
      conflict.conflicts.forEach(conf => {
        console.log(`      - ${conf}`);
      });
    });
    console.log();
  }

  // النتيجة النهائية
  console.log('='.repeat(80));
  if (result.summary.totalDuplicates === 0 && 
      result.summary.totalConflicts === 0 && 
      result.summary.totalSuspicious === 0) {
    console.log('âœ… لا توجد مشاكل مكتشفة!');
  } else {
    console.log('â‌Œ تم اكتشاف مشاكل تحتاج إلى معالجة');
    console.log('\nًں’، التوصيات:');
    console.log('   1. احذف الملفات المكررة أو ادمجها في ملف واحد');
    console.log('   2. تأكد من وجود ملف route.ts واحد فقط في كل مجلد');
    console.log('   3. أعد تسمية الملفات المشبوهة أو احذفها إذا لم تعد مستخدمة');
    console.log('   4. راجع التضاربات المحتملة وأزل المسارات المكررة');
  }
  console.log('='.repeat(80));
}

// تشغيل الفحص
if (require.main === module) {
  try {
    const result = checkApiDuplicates();
    printReport(result);
    
    // إرجاع كود خروج مناسب
    if (result.summary.totalDuplicates > 0 || 
        result.summary.totalConflicts > 0 || 
        result.summary.totalSuspicious > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('â‌Œ حدث خطأ أثناء الفحص:', error);
    process.exit(1);
  }
}

export { checkApiDuplicates, printReport };

