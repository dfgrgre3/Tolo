#!/usr/bin/env tsx
/**
 * سكربت لتنظيف وحذف الملفات المكررة في صفحات Next.js App Router
 * يحذف الملفات مثل page-enhanced.tsx, layout-new.tsx, page-new.tsx, page-advanced.tsx
 */

import * as fs from 'fs';
import * as path from 'path';
import { checkPageDuplicates } from './check-page-duplicates';

interface CleanupOptions {
  dryRun?: boolean;
  interactive?: boolean;
}

/**
 * حذف ملف مكرر
 */
function deleteDuplicateFile(filePath: string, dryRun: boolean = false): boolean {
  try {
    if (dryRun) {
      console.log(`   [DRY RUN] سيتم حذف: ${filePath}`);
      return true;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   ✅ تم حذف: ${filePath}`);
      return true;
    } else {
      console.log(`   ⚠️  الملف غير موجود: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ خطأ في حذف ${filePath}:`, error);
    return false;
  }
}

/**
 * تنظيف الملفات المكررة
 */
function cleanDuplicates(options: CleanupOptions = {}) {
  const { dryRun = false, interactive = false } = options;
  const appDir = path.join(process.cwd(), 'src', 'app');

  if (!fs.existsSync(appDir)) {
    console.error('❌ مجلد app غير موجود:', appDir);
    process.exit(1);
  }

  console.log('🧹 بدء تنظيف الملفات المكررة...\n');
  if (dryRun) {
    console.log('⚠️  وضع DRY RUN: لن يتم حذف أي ملفات فعلياً\n');
  }

  const result = checkPageDuplicates();
  let deletedCount = 0;
  let failedCount = 0;

  // حذف الملفات المكررة
  if (result.duplicates.length > 0) {
    console.log('\n🗑️  حذف الملفات المكررة:');
    console.log('-'.repeat(80));

    for (const dup of result.duplicates) {
      const dirPath = path.join(appDir, dup.directory);
      
      for (const file of dup.duplicateFiles) {
        const filePath = path.join(dirPath, file);
        const relativePath = `src/app/${dup.directory}/${file}`;

        if (interactive) {
          // في الوضع التفاعلي، نسأل المستخدم
          // لكن في السكربت التلقائي، نحذف مباشرة
          console.log(`\n   ملف: ${relativePath}`);
        }

        if (deleteDuplicateFile(filePath, dryRun)) {
          deletedCount++;
        } else {
          failedCount++;
        }
      }
    }
  }

  // حذف الملفات المشبوهة
  if (result.suspiciousFiles.length > 0) {
    console.log('\n🗑️  حذف الملفات المشبوهة:');
    console.log('-'.repeat(80));

    for (const file of result.suspiciousFiles) {
      const filePath = path.join(appDir, file);
      const relativePath = `src/app/${file}`;

      if (interactive) {
        console.log(`\n   ملف: ${relativePath}`);
      }

      if (deleteDuplicateFile(filePath, dryRun)) {
        deletedCount++;
      } else {
        failedCount++;
      }
    }
  }

  // الملخص
  console.log('\n' + '='.repeat(80));
  console.log('📊 ملخص التنظيف:');
  console.log(`   ✅ تم حذف: ${deletedCount} ملف`);
  if (failedCount > 0) {
    console.log(`   ❌ فشل في حذف: ${failedCount} ملف`);
  }
  if (dryRun) {
    console.log(`   ⚠️  وضع DRY RUN: لم يتم حذف أي ملفات فعلياً`);
  }
  console.log('='.repeat(80));

  return {
    deleted: deletedCount,
    failed: failedCount,
  };
}

// تشغيل التنظيف
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');
    const interactive = args.includes('--interactive') || args.includes('-i');

    if (dryRun) {
      console.log('⚠️  وضع DRY RUN مفعّل - لن يتم حذف أي ملفات\n');
    }

    const result = cleanDuplicates({ dryRun, interactive });

    if (result.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ حدث خطأ أثناء التنظيف:', error);
    process.exit(1);
  }
}

export { cleanDuplicates };

