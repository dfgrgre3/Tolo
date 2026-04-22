#!/usr/bin/env tsx
/**
 * ط³ظƒط±ط¨طھ ظ„طھظ†ط¸ظٹظپ ظˆط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ظپظٹ طµظپط­ط§طھ Next.js App Router
 * ظٹط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ظ…ط«ظ„ page-enhanced.tsx, layout-new.tsx, page-new.tsx, page-advanced.tsx
 */

import * as fs from 'fs';
import * as path from 'path';
import { checkPageDuplicates } from './check-page-duplicates';

interface CleanupOptions {
  dryRun?: boolean;
  interactive?: boolean;
}

/**
 * ط­ط°ظپ ظ…ظ„ظپ ظ…ظƒط±ط±
 */
function deleteDuplicateFile(filePath: string, dryRun: boolean = false): boolean {
  try {
    if (dryRun) {
      console.log(`   [DRY RUN] ط³ظٹطھظ… ط­ط°ظپ: ${filePath}`);
      return true;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   âœ… طھظ… ط­ط°ظپ: ${filePath}`);
      return true;
    } else {
      console.log(`   âڑ ï¸ڈ  ط§ظ„ظ…ظ„ظپ ط؛ظٹط± ظ…ظˆط¬ظˆط¯: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`   â‌Œ ط®ط·ط£ ظپظٹ ط­ط°ظپ ${filePath}:`, error);
    return false;
  }
}

/**
 * طھظ†ط¸ظٹظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©
 */
function cleanDuplicates(options: CleanupOptions = {}) {
  const { dryRun = false, interactive = false } = options;
  const appDir = path.join(process.cwd(), 'src', 'app');

  if (!fs.existsSync(appDir)) {
    console.error('â‌Œ ظ…ط¬ظ„ط¯ app ط؛ظٹط± ظ…ظˆط¬ظˆط¯:', appDir);
    process.exit(1);
  }

  console.log('ًں§¹ ط¨ط¯ط، طھظ†ط¸ظٹظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©...\n');
  if (dryRun) {
    console.log('âڑ ï¸ڈ  ظˆط¶ط¹ DRY RUN: ظ„ظ† ظٹطھظ… ط­ط°ظپ ط£ظٹ ظ…ظ„ظپط§طھ ظپط¹ظ„ظٹط§ظ‹\n');
  }

  const result = checkPageDuplicates();
  let deletedCount = 0;
  let failedCount = 0;

  // ط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©
  if (result.duplicates.length > 0) {
    console.log('\nًں—‘ï¸ڈ  ط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©:');
    console.log('-'.repeat(80));

    for (const dup of result.duplicates) {
      const dirPath = path.join(appDir, dup.directory);
      
      for (const file of dup.duplicateFiles) {
        const filePath = path.join(dirPath, file);
        const relativePath = `src/app/${dup.directory}/${file}`;

        if (interactive) {
          // ظپظٹ ط§ظ„ظˆط¶ط¹ ط§ظ„طھظپط§ط¹ظ„ظٹطŒ ظ†ط³ط£ظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…
          // ظ„ظƒظ† ظپظٹ ط§ظ„ط³ظƒط±ط¨طھ ط§ظ„طھظ„ظ‚ط§ط¦ظٹطŒ ظ†ط­ط°ظپ ظ…ط¨ط§ط´ط±ط©
          console.log(`\n   ظ…ظ„ظپ: ${relativePath}`);
        }

        if (deleteDuplicateFile(filePath, dryRun)) {
          deletedCount++;
        } else {
          failedCount++;
        }
      }
    }
  }

  // ط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
  if (result.suspiciousFiles.length > 0) {
    console.log('\nًں—‘ï¸ڈ  ط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©:');
    console.log('-'.repeat(80));

    for (const file of result.suspiciousFiles) {
      const filePath = path.join(appDir, file);
      const relativePath = `src/app/${file}`;

      if (interactive) {
        console.log(`\n   ظ…ظ„ظپ: ${relativePath}`);
      }

      if (deleteDuplicateFile(filePath, dryRun)) {
        deletedCount++;
      } else {
        failedCount++;
      }
    }
  }

  // ط§ظ„ظ…ظ„ط®طµ
  console.log('\n' + '='.repeat(80));
  console.log('ًں“ٹ ظ…ظ„ط®طµ ط§ظ„طھظ†ط¸ظٹظپ:');
  console.log(`   âœ… طھظ… ط­ط°ظپ: ${deletedCount} ظ…ظ„ظپ`);
  if (failedCount > 0) {
    console.log(`   â‌Œ ظپط´ظ„ ظپظٹ ط­ط°ظپ: ${failedCount} ظ…ظ„ظپ`);
  }
  if (dryRun) {
    console.log(`   âڑ ï¸ڈ  ظˆط¶ط¹ DRY RUN: ظ„ظ… ظٹطھظ… ط­ط°ظپ ط£ظٹ ظ…ظ„ظپط§طھ ظپط¹ظ„ظٹط§ظ‹`);
  }
  console.log('='.repeat(80));

  return {
    deleted: deletedCount,
    failed: failedCount,
  };
}

// طھط´ط؛ظٹظ„ ط§ظ„طھظ†ط¸ظٹظپ
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');
    const interactive = args.includes('--interactive') || args.includes('-i');

    if (dryRun) {
      console.log('âڑ ï¸ڈ  ظˆط¶ط¹ DRY RUN ظ…ظپط¹ظ‘ظ„ - ظ„ظ† ظٹطھظ… ط­ط°ظپ ط£ظٹ ظ…ظ„ظپط§طھ\n');
    }

    const result = cleanDuplicates({ dryRun, interactive });

    if (result.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('â‌Œ ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھظ†ط¸ظٹظپ:', error);
    process.exit(1);
  }
}

export { cleanDuplicates };

