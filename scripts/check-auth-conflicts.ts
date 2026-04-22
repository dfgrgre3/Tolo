#!/usr/bin/env tsx
/**
 * Script to check for authentication file conflicts and package conflicts
 * ظٹطھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ طھط¶ط§ط±ط¨ ظپظٹ ظ…ظ„ظپط§طھ ط§ظ„ظ…طµط§ط¯ظ‚ط© ظˆظ…ظƒطھط¨ط§طھ ط§ظ„ظ…طµط§ط¯ظ‚ط©
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

// Patterns that indicate incorrect usage of auth context
const INCORRECT_AUTH_USAGE = [
  // â‌Œ useAuth from contexts/auth-context (should not be exported)
  {
    pattern: /from ['"]@\/contexts\/auth-context['"].*useAuth/,
    message: 'useAuth ظ„ط§ ظٹطھظ… طھطµط¯ظٹط±ظ‡ ظ…ظ† @/contexts/auth-context - ط§ط³طھط®ط¯ظ… useUnifiedAuth ط¨ط¯ظ„ط§ظ‹ ظ…ظ†ظ‡',
    suggestion: 'ط§ط³طھط¨ط¯ظ„: import { useUnifiedAuth } from \'@/contexts/auth-context\'',
    type: 'incorrect_export' as const,
  },
  // â‌Œ AuthProvider from contexts/auth-context (should not be exported)
  {
    pattern: /from ['"]@\/contexts\/auth-context['"].*AuthProvider[^U]/,
    message: 'AuthProvider ظ„ط§ ظٹطھظ… طھطµط¯ظٹط±ظ‡ ظ…ظ† @/contexts/auth-context - ط§ط³طھط®ط¯ظ… UnifiedAuthProvider ط¨ط¯ظ„ط§ظ‹ ظ…ظ†ظ‡',
    suggestion: 'ط§ط³طھط¨ط¯ظ„: import { UnifiedAuthProvider } from \'@/contexts/auth-context\'',
    type: 'incorrect_export' as const,
  },
  // âڑ ï¸ڈ useAuthCompatibility (deprecated and throws error)
  {
    pattern: /useAuthCompatibility|from ['"].*compatibility['"].*useAuth/,
    message: 'useAuthCompatibility طھظ… ط¥ط²ط§ظ„طھظ‡ - ط§ط³طھط®ط¯ظ… useUnifiedAuth ط¨ط¯ظ„ط§ظ‹ ظ…ظ†ظ‡',
    suggestion: 'ط§ط³طھط¨ط¯ظ„: import { useUnifiedAuth } from \'@/contexts/auth-context\'',
    type: 'deprecated' as const,
  },
  // âڑ ï¸ڈ Dual providers (AuthProvider + UnifiedAuthProvider)
  {
    pattern: /<AuthProvider[^U].*<UnifiedAuthProvider|<UnifiedAuthProvider.*<AuthProvider[^U]/,
    message: 'طھط¶ط§ط±ط¨: ط§ط³طھط®ط¯ط§ظ… AuthProvider ظˆ UnifiedAuthProvider ظ…ط¹ط§ظ‹ - ط§ط³طھط®ط¯ظ… UnifiedAuthProvider ظپظ‚ط·',
    suggestion: 'ط§ط³طھط®ط¯ظ… UnifiedAuthProvider ظپظ‚ط· ظپظٹ Providers',
    type: 'dual_provider' as const,
  },
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
  incorrectUsage: Array<{ file: string; line: number; code: string; message: string; suggestion: string; type: 'incorrect_export' | 'deprecated' | 'dual_provider' }>;
  warnings: string[];
}

async function checkAuthConflicts(): Promise<ConflictReport> {
  const report: ConflictReport = {
    conflictingFiles: [],
    conflictingPackages: [],
    forbiddenImports: [],
    incorrectUsage: [],
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

  // Files that are allowed to have deprecated patterns (compatibility layers)
  const ALLOWED_DEPRECATED_FILES = [
    'lib/auth/compatibility.ts',
    'components/auth/UserProvider.tsx',
    'hooks/use-auth.ts',
  ];

  // Check for incorrect auth usage patterns
  for (const file of files) {
    // Skip compatibility/deprecated files themselves
    if (ALLOWED_DEPRECATED_FILES.some(allowed => file.replace(/\\/g, '/').includes(allowed))) {
      continue;
    }

    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check for incorrect export usage (useAuth/AuthProvider from contexts/auth-context)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const check of INCORRECT_AUTH_USAGE) {
        if (check.pattern.test(line)) {
          // Skip if it's in a comment or documentation file
          if (line.trim().startsWith('//') || line.trim().startsWith('*') || file.endsWith('.md')) {
            continue;
          }

          report.incorrectUsage.push({
            file: file,
            line: i + 1,
            code: line.trim(),
            message: check.message,
            suggestion: check.suggestion,
            type: check.type,
          });
        }
      }
    }

    // Check for dual providers (multiline check) - only for non-deprecated files
    const fullContent = content;
    const isAllowedFile = ALLOWED_DEPRECATED_FILES.some(allowed => file.replace(/\\/g, '/').includes(allowed));
    
    if (!isAllowedFile) {
      for (const check of INCORRECT_AUTH_USAGE) {
        if (check.type === 'dual_provider') {
        // Check if file contains both AuthProvider and UnifiedAuthProvider
        const hasAuthProvider = /<AuthProvider[^U]/.test(fullContent);
        const hasUnifiedAuthProvider = /<UnifiedAuthProvider/.test(fullContent);
        
        if (hasAuthProvider && hasUnifiedAuthProvider) {
          // Find the lines
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('<AuthProvider') || lines[i].includes('<UnifiedAuthProvider')) {
              const relevantLines: string[] = [];
              for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 5); j++) {
                if (lines[j].includes('Provider') || lines[j].trim().startsWith('<')) {
                  relevantLines.push(lines[j].trim());
                }
              }
              
              report.incorrectUsage.push({
                file: file,
                line: i + 1,
                code: relevantLines.join('\n'),
                message: check.message,
                suggestion: check.suggestion,
                type: check.type,
              });
            break;
          }
        }
      }
    }
    }
  }
  }

  return report;
}

function printReport(report: ConflictReport): void {
  console.log('\nًں”چ Authentication Conflict Check');
  console.log('ًں”چ ظپط­طµ طھط¹ط§ط±ط¶ط§طھ ط§ظ„ظ…طµط§ط¯ظ‚ط©\n');
  console.log('='.repeat(70));

  let hasConflicts = false;

  // Check conflicting files
  if (report.conflictingFiles.length > 0) {
    hasConflicts = true;
    console.log('\nâ‌Œ CONFLICTING FILES FOUND:');
    console.log('   â‌Œ طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ظ„ظپط§طھ ظ…طھط¶ط§ط±ط¨ط©:');
    console.log('   These files should NOT exist:');
    report.conflictingFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  } else {
    console.log('\nâœ… No conflicting files found');
    console.log('   âœ… ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ظ„ظپط§طھ ظ…طھط¶ط§ط±ط¨ط©');
  }

  // Check conflicting packages
  if (report.conflictingPackages.length > 0) {
    hasConflicts = true;
    console.log('\nâ‌Œ CONFLICTING PACKAGES FOUND IN package.json:');
    console.log('   â‌Œ طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ظƒطھط¨ط§طھ ظ…طھط¶ط§ط±ط¨ط© ظپظٹ package.json:');
    console.log('   These packages should be REMOVED:');
    console.log('   ظٹط¬ط¨ ط­ط°ظپ ظ‡ط°ظ‡ ط§ظ„ظ…ظƒطھط¨ط§طھ:');
    report.conflictingPackages.forEach(({ package: pkg, reason }) => {
      console.log(`   - ${pkg}`);
      console.log(`     Reason: ${reason}`);
      console.log(`     ط§ظ„ط³ط¨ط¨: ${reason}`);
    });
    console.log('\n   ًں’، To remove, run: npm uninstall <package-name>');
    console.log('   ًں’، ظ„ظ„ط­ط°ظپطŒ ط´ط؛ظ‘ظ„: npm uninstall <package-name>');
  } else {
    console.log('\nâœ… No conflicting packages found');
    console.log('   âœ… ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ظƒطھط¨ط§طھ ظ…طھط¶ط§ط±ط¨ط©');
  }

  // Check incorrect auth usage
  if (report.incorrectUsage.length > 0) {
    hasConflicts = true;
    console.log('\nâ‌Œ INCORRECT AUTH USAGE FOUND:');
    console.log('   â‌Œ طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ط³طھط®ط¯ط§ظ…ط§طھ ط؛ظٹط± طµط­ظٹط­ط© ظ„ظ„ظ…طµط§ط¯ظ‚ط©:');
    
    // Group by type
    const incorrectExports = report.incorrectUsage.filter(u => u.type === 'incorrect_export');
    const deprecated = report.incorrectUsage.filter(u => u.type === 'deprecated');
    const dualProviders = report.incorrectUsage.filter(u => u.type === 'dual_provider');

    if (incorrectExports.length > 0) {
      console.log('\n   ًںڑ« ط§ط³طھط®ط¯ط§ظ…ط§طھ طھطµط¯ظٹط± ط؛ظٹط± طµط­ظٹط­ط©:');
      incorrectExports.forEach(({ file, line, code, message, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${code}`);
        console.log(`     â‌Œ ${message}`);
        console.log(`     ًں’، ${suggestion}`);
      });
    }

    if (deprecated.length > 0) {
      console.log('\n   âڑ ï¸ڈ  ط§ط³طھط®ط¯ط§ظ…ط§طھ ظ…ظ‡ظ…ظ„ط© (Deprecated):');
      deprecated.forEach(({ file, line, code, message, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${code}`);
        console.log(`     âڑ ï¸ڈ  ${message}`);
        console.log(`     ًں’، ${suggestion}`);
      });
    }

    if (dualProviders.length > 0) {
      console.log('\n   âڑ ï¸ڈ  طھط¶ط§ط±ط¨: ط§ط³طھط®ط¯ط§ظ… Providers ظ…طھط¹ط¯ط¯ط©:');
      dualProviders.forEach(({ file, line, code, message, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${code.split('\n').join('\n     ')}`);
        console.log(`     âڑ ï¸ڈ  ${message}`);
        console.log(`     ًں’، ${suggestion}`);
      });
    }
  } else {
    console.log('\nâœ… No incorrect auth usage found');
    console.log('   âœ… ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ط³طھط®ط¯ط§ظ…ط§طھ ط؛ظٹط± طµط­ظٹط­ط©');
  }

  // Check forbidden imports
  if (report.forbiddenImports.length > 0) {
    hasConflicts = true;
    console.log('\nâ‌Œ FORBIDDEN IMPORTS FOUND:');
    console.log('   â‌Œ طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ط³طھظٹط±ط§ط¯ط§طھ ظ…ط­ط¸ظˆط±ط©:');
    
    // Group by type
    const clerkImports = report.forbiddenImports.filter(imp => imp.type === 'clerk');
    const nextAuthImports = report.forbiddenImports.filter(imp => imp.type === 'nextauth');
    const fileImports = report.forbiddenImports.filter(imp => imp.type === 'file');

    if (clerkImports.length > 0) {
      console.log('\n   ًںڑ« Clerk imports (Clerk ط§ط³طھظٹط±ط§ط¯ط§طھ):');
      clerkImports.forEach(({ file, line, import: importLine, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${importLine}`);
        console.log(`     ًں’، ${suggestion}`);
      });
    }

    if (nextAuthImports.length > 0) {
      console.log('\n   ًںڑ« NextAuth imports (NextAuth ط§ط³طھظٹط±ط§ط¯ط§طھ):');
      nextAuthImports.forEach(({ file, line, import: importLine, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${importLine}`);
        console.log(`     ًں’، ${suggestion}`);
      });
    }

    if (fileImports.length > 0) {
      console.log('\n   ًںڑ« Conflicting file imports (ط§ط³طھظٹط±ط§ط¯ط§طھ ظ…ظ„ظپط§طھ ظ…طھط¶ط§ط±ط¨ط©):');
      fileImports.forEach(({ file, line, import: importLine, suggestion }) => {
        console.log(`   - ${file}:${line}`);
        console.log(`     ${importLine}`);
        console.log(`     ًں’، ${suggestion}`);
      });
    }
  } else {
    console.log('\nâœ… No forbidden imports found');
    console.log('   âœ… ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ط³طھظٹط±ط§ط¯ط§طھ ظ…ط­ط¸ظˆط±ط©');
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('\nâڑ ï¸ڈ  WARNINGS:');
    report.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  
  if (hasConflicts) {
    console.log('\nâڑ ï¸ڈ  CONFLICTS DETECTED! Please fix the issues above.');
    console.log('âڑ ï¸ڈ  طھظ… ط§ظƒطھط´ط§ظپ طھط¹ط§ط±ط¶ط§طھ! ظٹط±ط¬ظ‰ ط¥طµظ„ط§ط­ ط§ظ„ظ…ط´ط§ظƒظ„ ط£ط¹ظ„ط§ظ‡.');
    console.log('\nًں“ڑ See AUTH_STRUCTURE_UNIFIED.md for correct usage.');
    console.log('ًں“ڑ ط±ط§ط¬ط¹ AUTH_STRUCTURE_UNIFIED.md ظ„ظ„ط§ط³طھط®ط¯ط§ظ… ط§ظ„طµط­ظٹط­.');
    console.log('\nًں’، Quick fix suggestions:');
    console.log('ًں’، ط§ظ‚طھط±ط§ط­ط§طھ ط§ظ„ط¥طµظ„ط§ط­ ط§ظ„ط³ط±ظٹط¹:');
    if (report.conflictingPackages.length > 0) {
      const packages = report.conflictingPackages.map(p => p.package).join(' ');
      console.log(`   - npm uninstall ${packages}`);
    }
    process.exit(1);
  } else {
    console.log('\nâœ… No conflicts detected! Authentication structure is clean.');
    console.log('âœ… ظ„ظ… ظٹطھظ… ط§ظƒطھط´ط§ظپ طھط¹ط§ط±ط¶ط§طھ! ط¨ظ†ظٹط© ط§ظ„ظ…طµط§ط¯ظ‚ط© ظ†ط¸ظٹظپط©.');
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

