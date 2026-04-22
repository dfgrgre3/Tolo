#!/usr/bin/env tsx
/**
 * ط³ظƒط±ط¨طھ ظ„ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ط²ط¯ظˆط§ط¬ظٹط© ظ…ظ„ظپط§طھ ط§ظ„طµظپط­ط§طھ (Pages) ظپظٹ Next.js App Router
 * ظٹظƒطھط´ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ظ…ط«ظ„ page-enhanced.tsx, layout-new.tsx, page-new.tsx, page-advanced.tsx
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

// ط§ظ„ط£ظ†ظ…ط§ط· ط§ظ„ظ…ط´ط¨ظˆظ‡ط© ظ„ط£ط³ظ…ط§ط، ط§ظ„ظ…ظ„ظپط§طھ
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


/**
 * ط§ظ„ط¨ط­ط« ط¹ظ† ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط© ظپظٹ ظ…ط¬ظ„ط¯ app
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
        // طھط®ط·ظٹ node_modules ظˆ .next
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
          continue;
        }
        scanDirectory(fullPath, relativeFilePath);
      } else if (entry.isFile()) {
        // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط£ظ†ظ…ط§ط· ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
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
 * ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط¬ظ„ط¯
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
        
        // ظ…ظ„ظپط§طھ page ط§ظ„ظ‚ظٹط§ط³ظٹط©
        if (fileName === 'page.ts' || fileName === 'page.tsx') {
          pageFiles.push(entry.name);
        }
        // ظ…ظ„ظپط§طھ layout ط§ظ„ظ‚ظٹط§ط³ظٹط©
        else if (fileName === 'layout.ts' || fileName === 'layout.tsx') {
          layoutFiles.push(entry.name);
        }
        // ظ…ظ„ظپط§طھ page ظ…ط´ط¨ظˆظ‡ط© (ظ…ط«ظ„ page-enhanced.tsx)
        else if (fileName.startsWith('page-') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
          otherPageFiles.push(entry.name);
        }
        // ظ…ظ„ظپط§طھ layout ظ…ط´ط¨ظˆظ‡ط© (ظ…ط«ظ„ layout-new.tsx)
        else if (fileName.startsWith('layout-') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
          otherLayoutFiles.push(entry.name);
        }
      }
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ط²ط¯ظˆط§ط¬ظٹط© ظ…ظ„ظپط§طھ page
    if (pageFiles.length > 0 && otherPageFiles.length > 0) {
      duplicates.push({
        directory: relativePath || 'app',
        files: [...pageFiles, ...otherPageFiles],
        standardFile: pageFiles[0],
        duplicateFiles: otherPageFiles,
        issue: `Found standard page.tsx alongside duplicate page files: ${otherPageFiles.join(', ')}`,
      });
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ط²ط¯ظˆط§ط¬ظٹط© ظ…ظ„ظپط§طھ layout
    if (layoutFiles.length > 0 && otherLayoutFiles.length > 0) {
      duplicates.push({
        directory: relativePath || 'app',
        files: [...layoutFiles, ...otherLayoutFiles],
        standardFile: layoutFiles[0],
        duplicateFiles: otherLayoutFiles,
        issue: `Found standard layout.tsx alongside duplicate layout files: ${otherLayoutFiles.join(', ')}`,
      });
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ…ظ„ظپط§طھ page ظ…طھط¹ط¯ط¯ط© ط¨ط¯ظˆظ† ظ…ظ„ظپ ظ‚ظٹط§ط³ظٹ
    if (pageFiles.length === 0 && otherPageFiles.length > 1) {
      duplicates.push({
        directory: relativePath || 'app',
        files: otherPageFiles,
        standardFile: null,
        duplicateFiles: otherPageFiles,
        issue: `Found multiple duplicate page files without a standard page.tsx: ${otherPageFiles.join(', ')}`,
      });
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ…ظ„ظپط§طھ layout ظ…طھط¹ط¯ط¯ط© ط¨ط¯ظˆظ† ظ…ظ„ظپ ظ‚ظٹط§ط³ظٹ
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
        // طھط®ط·ظٹ node_modules ظˆ .next
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
 * ط§ظ„ظˆط¸ظٹظپط© ط§ظ„ط±ط¦ظٹط³ظٹط©
 */
function checkPageDuplicates(): CheckResult {
  const appDir = path.join(process.cwd(), 'src', 'app');

  if (!fs.existsSync(appDir)) {
    console.error('â‌Œ ظ…ط¬ظ„ط¯ app ط؛ظٹط± ظ…ظˆط¬ظˆط¯:', appDir);
    process.exit(1);
  }

  console.log('ًں”چ ط¨ط¯ط، ظپط­طµ ظ…ظ„ظپط§طھ ط§ظ„طµظپط­ط§طھ (Pages) ظپظٹ App Router...\n');

  // 1. ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©
  const duplicates = detectDuplicates(appDir);
  console.log(`âœ“ طھظ… ظپط­طµ ط§ط²ط¯ظˆط§ط¬ظٹط© ط§ظ„ظ…ظ„ظپط§طھ`);

  // 2. ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
  const suspiciousFiles = findSuspiciousFiles(appDir);
  console.log(`âœ“ طھظ… ظپط­طµ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©\n`);

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
 * ط·ط¨ط§ط¹ط© ط§ظ„طھظ‚ط±ظٹط±
 */
function printReport(result: CheckResult) {
  console.log('='.repeat(80));
  console.log('ًں“ٹ طھظ‚ط±ظٹط± ظپط­طµ ط§ط²ط¯ظˆط§ط¬ظٹط© ظ…ظ„ظپط§طھ ط§ظ„طµظپط­ط§طھ (Pages)');
  console.log('='.repeat(80));
  console.log();

  // ظ…ظ„ط®طµ
  console.log('ًں“ˆ ط§ظ„ظ…ظ„ط®طµ:');
  console.log(`   â€¢ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©: ${result.summary.totalDuplicates}`);
  console.log(`   â€¢ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©: ${result.summary.totalSuspicious}`);
  console.log();

  // ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©
  if (result.duplicates.length > 0) {
    console.log('âڑ ï¸ڈ  ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©:');
    console.log('-'.repeat(80));
    result.duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. ط§ظ„ظ…ط¬ظ„ط¯: src/app/${dup.directory}`);
      console.log(`   ط§ظ„ظ…ط´ظƒظ„ط©: ${dup.issue}`);
      if (dup.standardFile) {
        console.log(`   âœ… ط§ظ„ظ…ظ„ظپ ط§ظ„ظ‚ظٹط§ط³ظٹ: ${dup.standardFile}`);
      }
      console.log(`   â‌Œ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© (ظٹط¬ط¨ ط­ط°ظپظ‡ط§):`);
      dup.duplicateFiles.forEach(file => {
        console.log(`      - ${file}`);
      });
    });
    console.log();
  }

  // ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
  if (result.suspiciousFiles.length > 0) {
    console.log('ًں”چ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط© (طھط­طھظˆظٹ ط¹ظ„ظ‰ ط£ظ†ظ…ط§ط· ظ…ط«ظ„ -enhanced, -new, -advanced):');
    console.log('-'.repeat(80));
    result.suspiciousFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. src/app/${file}`);
    });
    console.log();
  }

  // ط§ظ„ظ†طھظٹط¬ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط©
  console.log('='.repeat(80));
  if (result.summary.totalDuplicates === 0 && result.summary.totalSuspicious === 0) {
    console.log('âœ… ظ„ط§ طھظˆط¬ط¯ ظ…ط´ط§ظƒظ„ ظ…ظƒطھط´ظپط©!');
  } else {
    console.log('â‌Œ طھظ… ط§ظƒطھط´ط§ظپ ظ…ط´ط§ظƒظ„ طھط­طھط§ط¬ ط¥ظ„ظ‰ ظ…ط¹ط§ظ„ط¬ط©');
    console.log('\nًں’، ط§ظ„طھظˆطµظٹط§طھ:');
    console.log('   1. Next.js ظٹط³طھط®ط¯ظ… ظپظ‚ط· ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ‚ظٹط§ط³ظٹط© (page.tsx, layout.tsx)');
    console.log('   2. ط§ط­ط°ظپ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© (page-enhanced.tsx, layout-new.tsx, etc.)');
    console.log('   3. ط¥ط°ط§ ظƒط§ظ† ظ„ط¯ظٹظƒ ظ…ط­طھظˆظ‰ ظ…ظ‡ظ… ظپظٹ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©طŒ ط§ظ†ظ‚ظ„ظ‡ ط¥ظ„ظ‰ ط§ظ„ظ…ظ„ظپ ط§ظ„ظ‚ظٹط§ط³ظٹ');
    console.log('   4. ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© طھط²ظٹط¯ ط­ط¬ظ… ط§ظ„ظ…ط´ط±ظˆط¹ ظˆطھط´طھطھ ط§ظ„ظ…ط·ظˆط±ظٹظ†');
    console.log('\nًں“‌ ظ„طھظ†ط¸ظٹظپ ط§ظ„ظ…ظ„ظپط§طھ طھظ„ظ‚ط§ط¦ظٹط§ظ‹طŒ ط§ط³طھط®ط¯ظ…:');
    console.log('   npm run clean:page-duplicates');
  }
  console.log('='.repeat(80));
}

// طھط´ط؛ظٹظ„ ط§ظ„ظپط­طµ
if (require.main === module) {
  try {
    const result = checkPageDuplicates();
    printReport(result);
    
    // ط¥ط±ط¬ط§ط¹ ظƒظˆط¯ ط®ط±ظˆط¬ ظ…ظ†ط§ط³ط¨
    if (result.summary.totalDuplicates > 0 || result.summary.totalSuspicious > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('â‌Œ ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ظپط­طµ:', error);
    process.exit(1);
  }
}

export { checkPageDuplicates, printReport };

