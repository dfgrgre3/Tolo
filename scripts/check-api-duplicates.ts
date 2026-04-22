#!/usr/bin/env tsx
/**
 * ط³ظƒط±ط¨طھ ظ„ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ط²ط¯ظˆط§ط¬ظٹط© ظ…ظ„ظپط§طھ API Routes ظپظٹ Next.js
 * ظٹظƒطھط´ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ظˆط§ظ„ظ…ط´ط§ظƒظ„ ط§ظ„ظ…ط­طھظ…ظ„ط© ظپظٹ ط¨ظ†ظٹط© API Routes
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

// ط§ظ„ط£ظ†ظ…ط§ط· ط§ظ„ظ…ط´ط¨ظˆظ‡ط© ظ„ط£ط³ظ…ط§ط، ط§ظ„ظ…ظ„ظپط§طھ
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
 * ط§ظ„ط¨ط­ط« ط¹ظ† ط¬ظ…ظٹط¹ ظ…ظ„ظپط§طھ route ظپظٹ ظ…ط¬ظ„ط¯ API
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
        // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظ…ظ„ظپط§طھ route
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
 * ط§ظ„ط¨ط­ط« ط¹ظ† ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
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
        // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط£ظ†ظ…ط§ط· ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
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
 * ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط¬ظ„ط¯
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
 * ط§ظƒطھط´ط§ظپ ط§ظ„طھط¶ط§ط±ط¨ط§طھ ط§ظ„ظ…ط­طھظ…ظ„ط© ظپظٹ ط§ظ„ظ…ط³ط§ط±ط§طھ
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
        // طھط®ط·ظٹ ط§ظ„ظ…ط¬ظ„ط¯ط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© [id]
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

  // ط§ظ„ط¨ط­ط« ط¹ظ† ظ…ط³ط§ط±ط§طھ ظ…طھط´ط§ط¨ظ‡ط© ظ‚ط¯ طھط³ط¨ط¨ طھط¶ط§ط±ط¨ط§ظ‹
  // ظ…ظ„ط§ط­ط¸ط©: ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„ظ…طھط¯ط§ط®ظ„ط© ظپظٹ Next.js ظ…ط³ظ…ظˆط­ط© (ظ…ط«ظ„ /api/auth ظˆ /api/auth/login)
  // ظ†ط­ظ† ظ†ط¨ط­ط« ظپظ‚ط· ط¹ظ† ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„طھظٹ ظ‚ط¯ طھظƒظˆظ† ظ…ظƒط±ط±ط© ط£ظˆ ظ…طھط´ط§ط¨ظ‡ط© ط¨ط´ظƒظ„ ظ…ط´ط¨ظˆظ‡
  const pathArray = Array.from(routePaths.keys());
  for (let i = 0; i < pathArray.length; i++) {
    for (let j = i + 1; j < pathArray.length; j++) {
      const path1 = pathArray[i];
      const path2 = pathArray[j];

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„ظ…طھط´ط§ط¨ظ‡ط© (طھط¬ط§ظ‡ظ„ ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„ظ…طھط¯ط§ط®ظ„ط© ط§ظ„طµط­ظٹط­ط©)
      if (arePathsConflicting(path1, path2)) {
        // طھط¬ط§ظ‡ظ„ ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„ظ…طھط¯ط§ط®ظ„ط© ط§ظ„طµط­ظٹط­ط© ظپظٹ Next.js
        // ظ…ط«ظ„: /api/auth ظˆ /api/auth/login (ظ‡ط°ط§ ظ…ط³ظ…ظˆط­)
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
 * ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ طھط¶ط§ط±ط¨ ط­ظ‚ظٹظ‚ظٹ ط¨ظٹظ† ظ…ط³ط§ط±ظٹظ†
 * ظپظٹ Next.jsطŒ ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„ظ…طھط¯ط§ط®ظ„ط© ظ…ط³ظ…ظˆط­ط© (ظ…ط«ظ„: /api/auth ظˆ /api/auth/login)
 * ط§ظ„طھط¶ط§ط±ط¨ ط§ظ„ط­ظ‚ظٹظ‚ظٹ ظٹط­ط¯ط« ظپظ‚ط· ط¹ظ†ط¯ظ…ط§ ظٹظƒظˆظ† ظ‡ظ†ط§ظƒ ظ…ظ„ظپط§ظ† route.ts ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط¬ظ„ط¯
 */
function arePathsConflicting(path1: string, path2: string): boolean {
  // ظ…ط³ط§ط±ط§طھ ظ…طھط·ط§ط¨ظ‚ط© طھظ…ط§ظ…ط§ظ‹ - ظ‡ط°ط§ طھط¶ط§ط±ط¨ ط­ظ‚ظٹظ‚ظٹ
  if (path1 === path2) {
    return true;
  }

  // ظ…ط³ط§ط±ط§طھ ظ…طھط´ط§ط¨ظ‡ط© ط¬ط¯ط§ظ‹ (ظ…ط«ظ„: users/register ظˆ users/register-improved)
  // ظ‡ط°ط§ ظٹط´ظٹط± ط¥ظ„ظ‰ ظˆط¬ظˆط¯ ظ…ظ„ظپط§طھ ظ…ظƒط±ط±ط© ط¨ط£ط³ظ…ط§ط، ظ…ط®طھظ„ظپط©
  const normalized1 = path1.replace(/[-_]/g, '').toLowerCase();
  const normalized2 = path2.replace(/[-_]/g, '').toLowerCase();
  
  // ط¥ط°ط§ ظƒط§ظ†طھ ط§ظ„ظ…ط³ط§ط±ط§طھ ظ…طھط·ط§ط¨ظ‚ط© ط¨ط¹ط¯ ط¥ط²ط§ظ„ط© ط§ظ„ط´ط±ط·ط§طھ ظˆط§ظ„ط´ط±ط·ط§طھ ط§ظ„ط³ظپظ„ظٹط©
  if (normalized1 === normalized2) {
    return true;
  }

  // ظ…ط³ط§ط±ط§طھ ظ…طھط´ط§ط¨ظ‡ط© ط¬ط²ط¦ظٹط§ظ‹ ظ‚ط¯ طھط´ظٹط± ط¥ظ„ظ‰ ط§ط²ط¯ظˆط§ط¬ظٹط©
  // ظ…ط«ظ„: "reminders" ظˆ "reminders-improved" (ط¥ط°ط§ ظƒط§ظ†ط§ ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط³طھظˆظ‰)
  const parts1 = path1.split('/');
  const parts2 = path2.split('/');
  
  // ط¥ط°ط§ ظƒط§ظ†ط§ ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط³طھظˆظ‰ ظˆظ„ظ‡ظ…ط§ ظ†ظپط³ ط§ظ„ط¨ط§ط¯ط¦ط©
  if (parts1.length === parts2.length && parts1.length > 0) {
    const lastPart1 = parts1[parts1.length - 1].toLowerCase();
    const lastPart2 = parts2[parts2.length - 1].toLowerCase();
    
    // طھط£ظƒط¯ ظ…ظ† ط£ظ† ط§ظ„ظ…ط³ط§ط±ط§طھ ظ…طھط´ط§ط¨ظ‡ط© ظپظٹ ط§ظ„ط£ط¬ط²ط§ط، ط§ظ„ط³ط§ط¨ظ‚ط©
    const prefix1 = parts1.slice(0, -1).join('/');
    const prefix2 = parts2.slice(0, -1).join('/');
    
    if (prefix1 === prefix2) {
      // ط¥ط°ط§ ظƒط§ظ† ط§ظ„ط¬ط²ط، ط§ظ„ط£ط®ظٹط± ظ…طھط´ط§ط¨ظ‡ط§ظ‹ ط¨ط´ظƒظ„ ظ…ط´ط¨ظˆظ‡
      // ظ…ط«ظ„: "reminders" ظˆ "reminders-improved"
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
      
      // ط­ط§ظ„ط© ط®ط§طµط©: ط¬ظ…ط¹ ط¨ط³ظٹط· (ظ…ط«ظ„: session -> sessions)
      // ظ„ظƒظ† ظپظ‚ط· ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظپط±ظ‚ ظ‡ظˆ ط­ط±ظپ 's' ظپظ‚ط· ظپظٹ ط§ظ„ظ†ظ‡ط§ظٹط©
      if (lastPart1 + 's' === lastPart2 || lastPart2 + 's' === lastPart1) {
        // ظ‡ط°ظ‡ ظ‚ط¯ طھظƒظˆظ† ظ…ط³ط§ط±ط§طھ طµط­ظٹط­ط©طŒ ظ„ظƒظ† ظ†ط¨ظ„ط؛ ط¹ظ†ظ‡ط§ ظ„ظ„طھط­ظ‚ظ‚
        return true;
      }
      
      // طھط¬ط§ظ‡ظ„ ط§ظ„ط­ط§ظ„ط§طھ ط§ظ„طھظٹ طھظƒظˆظ† ظپظٹظ‡ط§ ط§ظ„ظ…ط³ط§ط±ط§طھ ظ…ط®طھظ„ظپط© طھظ…ط§ظ…ط§ظ‹
      // ظ…ط«ظ„: "verify" ظˆ "verify-login" (ظ‡ط°ظ‡ ظ…ط³ط§ط±ط§طھ طµط­ظٹط­ط©)
      if (lastPart1.includes('-') && lastPart2.includes('-')) {
        // ط¥ط°ط§ ظƒط§ظ† ظƒظ„ط§ظ‡ظ…ط§ ظٹط­طھظˆظٹ ط¹ظ„ظ‰ ط´ط±ط·ط©طŒ ظپظ‡ظ…ط§ ظ…ط³ط§ط±ط§طھ ظ…ط®طھظ„ظپط©
        return false;
      }
    }
  }

  return false;
}

/**
 * ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ…ظ„ظپط§طھ route ظ…ظƒط±ط±ط© ط¨ط¬ط§ظ†ط¨ ط¨ط¹ط¶ظ‡ط§
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

    // ط¥ط°ط§ ظƒط§ظ† ظ‡ظ†ط§ظƒ route.ts ظˆظ…ظ„ظپط§طھ route ط£ط®ط±ظ‰
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
 * ط§ظ„ظˆط¸ظٹظپط© ط§ظ„ط±ط¦ظٹط³ظٹط©
 */
function checkApiDuplicates(): CheckResult {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');

  if (!fs.existsSync(apiDir)) {
    console.error('â‌Œ ظ…ط¬ظ„ط¯ API ط؛ظٹط± ظ…ظˆط¬ظˆط¯:', apiDir);
    process.exit(1);
  }

  console.log('ًں”چ ط¨ط¯ط، ظپط­طµ ظ…ظ„ظپط§طھ API Routes...\n');

  // 1. ط§ظ„ط¨ط­ط« ط¹ظ† ظ…ظ„ظپط§طھ route
  const routeFiles = findRouteFiles(apiDir);
  console.log(`âœ“ طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ${routeFiles.size} ظ…ط¬ظ„ط¯ ظٹط­طھظˆظٹ ط¹ظ„ظ‰ route files`);

  // 2. ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط¬ظ„ط¯
  const duplicates = detectDuplicates(routeFiles);
  console.log(`âœ“ طھظ… ظپط­طµ ط§ط²ط¯ظˆط§ط¬ظٹط© ط§ظ„ظ…ظ„ظپط§طھ ظپظٹ ظ†ظپط³ ط§ظ„ظ…ط¬ظ„ط¯`);

  // 3. ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ط§ظ„ظ…ط¬ط§ظˆط±ط©
  const adjacentDuplicates = checkAdjacentDuplicates(apiDir);
  console.log(`âœ“ طھظ… ظپط­طµ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط¬ط§ظˆط±ط©`);

  // 4. ط§ظƒطھط´ط§ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
  const suspiciousFiles = findSuspiciousFiles(apiDir);
  console.log(`âœ“ طھظ… ظپط­طµ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©`);

  // 5. ط§ظƒطھط´ط§ظپ ط§ظ„طھط¶ط§ط±ط¨ط§طھ
  const conflicts = detectConflicts(apiDir);
  console.log(`âœ“ طھظ… ظپط­طµ ط§ظ„طھط¶ط§ط±ط¨ط§طھ ط§ظ„ظ…ط­طھظ…ظ„ط©\n`);

  // ط¯ظ…ط¬ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©
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
 * ط·ط¨ط§ط¹ط© ط§ظ„طھظ‚ط±ظٹط±
 */
function printReport(result: CheckResult) {
  console.log('='.repeat(80));
  console.log('ًں“ٹ طھظ‚ط±ظٹط± ظپط­طµ ط§ط²ط¯ظˆط§ط¬ظٹط© ظ…ظ„ظپط§طھ API Routes');
  console.log('='.repeat(80));
  console.log();

  // ظ…ظ„ط®طµ
  console.log('ًں“ˆ ط§ظ„ظ…ظ„ط®طµ:');
  console.log(`   â€¢ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©: ${result.summary.totalDuplicates}`);
  console.log(`   â€¢ ط§ظ„طھط¶ط§ط±ط¨ط§طھ: ${result.summary.totalConflicts}`);
  console.log(`   â€¢ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©: ${result.summary.totalSuspicious}`);
  console.log();

  // ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©
  if (result.duplicates.length > 0) {
    console.log('âڑ ï¸ڈ  ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط©:');
    console.log('-'.repeat(80));
    result.duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. ط§ظ„ظ…ط¬ظ„ط¯: ${dup.directory}`);
      console.log(`   ط§ظ„ظ…ط´ظƒظ„ط©: ${dup.issue}`);
      console.log(`   ط§ظ„ظ…ظ„ظپط§طھ:`);
      dup.files.forEach(file => {
        console.log(`      - ${file}`);
      });
    });
    console.log();
  }

  // ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط©
  if (result.suspiciousFiles.length > 0) {
    console.log('ًں”چ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط© (طھط­طھظˆظٹ ط¹ظ„ظ‰ ط£ظ†ظ…ط§ط· ظ…ط«ظ„ -improved, -enhanced, -new):');
    console.log('-'.repeat(80));
    result.suspiciousFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log();
  }

  // ط§ظ„طھط¶ط§ط±ط¨ط§طھ
  if (result.conflicts.length > 0) {
    console.log('âڑ، ط§ظ„طھط¶ط§ط±ط¨ط§طھ ط§ظ„ظ…ط­طھظ…ظ„ط©:');
    console.log('-'.repeat(80));
    console.log('âڑ ï¸ڈ  ظ…ظ„ط§ط­ط¸ط©: ط¨ط¹ط¶ ظ‡ط°ظ‡ ط§ظ„طھط¶ط§ط±ط¨ط§طھ ظ‚ط¯ طھظƒظˆظ† ظ…ط³ط§ط±ط§طھ طµط­ظٹط­ط© ظپظٹ Next.js.');
    console.log('   ط±ط§ط¬ط¹ ظƒظ„ ظ…ط³ط§ط± ظ„ظ„طھط£ظƒط¯ ظ…ظ† ط£ظ†ظ‡ ظ…ط·ظ„ظˆط¨ ظˆظ„ظٹط³ ظ…ظƒط±ط±ط§ظ‹.\n');
    result.conflicts.forEach((conflict, index) => {
      console.log(`\n${index + 1}. ط§ظ„ظ…ط³ط§ط±: ${conflict.path}`);
      console.log(`   ط§ظ„ط®ط·ظˆط±ط©: ${conflict.severity}`);
      console.log(`   ظٹطھط¹ط§ط±ط¶ ظ…ط¹:`);
      conflict.conflicts.forEach(conf => {
        console.log(`      - ${conf}`);
      });
    });
    console.log();
  }

  // ط§ظ„ظ†طھظٹط¬ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط©
  console.log('='.repeat(80));
  if (result.summary.totalDuplicates === 0 && 
      result.summary.totalConflicts === 0 && 
      result.summary.totalSuspicious === 0) {
    console.log('âœ… ظ„ط§ طھظˆط¬ط¯ ظ…ط´ط§ظƒظ„ ظ…ظƒطھط´ظپط©!');
  } else {
    console.log('â‌Œ طھظ… ط§ظƒطھط´ط§ظپ ظ…ط´ط§ظƒظ„ طھط­طھط§ط¬ ط¥ظ„ظ‰ ظ…ط¹ط§ظ„ط¬ط©');
    console.log('\nًں’، ط§ظ„طھظˆطµظٹط§طھ:');
    console.log('   1. ط§ط­ط°ظپ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ظƒط±ط±ط© ط£ظˆ ط§ط¯ظ…ط¬ظ‡ط§ ظپظٹ ظ…ظ„ظپ ظˆط§ط­ط¯');
    console.log('   2. طھط£ظƒط¯ ظ…ظ† ظˆط¬ظˆط¯ ظ…ظ„ظپ route.ts ظˆط§ط­ط¯ ظپظ‚ط· ظپظٹ ظƒظ„ ظ…ط¬ظ„ط¯');
    console.log('   3. ط£ط¹ط¯ طھط³ظ…ظٹط© ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ…ط´ط¨ظˆظ‡ط© ط£ظˆ ط§ط­ط°ظپظ‡ط§ ط¥ط°ط§ ظ„ظ… طھط¹ط¯ ظ…ط³طھط®ط¯ظ…ط©');
    console.log('   4. ط±ط§ط¬ط¹ ط§ظ„طھط¶ط§ط±ط¨ط§طھ ط§ظ„ظ…ط­طھظ…ظ„ط© ظˆط£ط²ظ„ ط§ظ„ظ…ط³ط§ط±ط§طھ ط§ظ„ظ…ظƒط±ط±ط©');
  }
  console.log('='.repeat(80));
}

// طھط´ط؛ظٹظ„ ط§ظ„ظپط­طµ
if (require.main === module) {
  try {
    const result = checkApiDuplicates();
    printReport(result);
    
    // ط¥ط±ط¬ط§ط¹ ظƒظˆط¯ ط®ط±ظˆط¬ ظ…ظ†ط§ط³ط¨
    if (result.summary.totalDuplicates > 0 || 
        result.summary.totalConflicts > 0 || 
        result.summary.totalSuspicious > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('â‌Œ ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ظپط­طµ:', error);
    process.exit(1);
  }
}

export { checkApiDuplicates, printReport };

