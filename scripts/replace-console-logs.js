/**
 * Script to replace console.* calls with unified logger
 * سكريبت لاستبدال استخدامات console.* بنظام التسجيل الموحد
 */

const fs = require('fs');
const path = require('path');

// Patterns to match console.* calls
const consolePatterns = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    level: 'info',
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    level: 'error',
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    level: 'warn',
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    level: 'debug',
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    level: 'info',
  },
];

// Files to exclude
const excludePatterns = [
  /node_modules/,
  /\.next/,
  /coverage/,
  /\.git/,
  /scripts\/replace-console-logs\.js/,
  /src\/lib\/logging\/unified-logger\.ts/,
  /src\/lib\/logger\.ts/,
  /src\/services\/ErrorLogger\.ts/, // Keep console in ErrorLogger to avoid recursion
];

// Check if file should be processed
function shouldProcessFile(filePath) {
  return excludePatterns.every(pattern => !pattern.test(filePath));
}

// Get all TypeScript/JavaScript files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (
      (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) &&
      shouldProcessFile(filePath)
    ) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Check if file already imports logger
function hasLoggerImport(content) {
  return /import.*logger.*from|from.*logger|require.*logger/.test(content);
}

// Add logger import if needed
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Determine import style based on file extension
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const importStatement = isTypeScript
    ? "import { logger } from '@/lib/logger';\n"
    : "const { logger } = require('@/lib/logger');\n";

  // Find all import statements
  const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    // Find the last import line
    let lastImportIndex = -1;
    let lastImportLine = '';
    imports.forEach(importLine => {
      const index = content.lastIndexOf(importLine);
      if (index > lastImportIndex) {
        lastImportIndex = index;
        lastImportLine = importLine;
      }
    });
    
    if (lastImportIndex !== -1) {
      // Add after last import, preserving the newline
      const insertIndex = lastImportIndex + lastImportLine.length;
      // Check if there's already a newline after the import
      const afterImport = content.slice(insertIndex);
      const needsNewline = !afterImport.startsWith('\n');
      return content.slice(0, insertIndex) + 
             (needsNewline ? '\n' : '') + 
             importStatement + 
             content.slice(insertIndex);
    }
  }

  // If no imports found, add at the top (after any comments or 'use strict')
  const topCommentMatch = content.match(/^(\/\*\*[\s\S]*?\*\/|^\/\/.*|^['"]use strict['"];?\s*)/m);
  if (topCommentMatch) {
    const insertIndex = topCommentMatch[0].length;
    return content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
  }

  // If nothing found, add at the very top
  return importStatement + content;
}

// Replace console.* calls in content
function replaceConsoleCalls(content, filePath) {
  let modified = content;
  let hasChanges = false;

  // Check if file needs logger import
  const needsImport = /console\.(log|error|warn|debug|info)\(/.test(modified);

  if (!needsImport) {
    return { content: modified, hasChanges: false };
  }

  // Replace console.* calls
  consolePatterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(modified)) {
      modified = modified.replace(pattern, replacement);
      hasChanges = true;
    }
  });

  // Add logger import if needed
  if (hasChanges) {
    modified = addLoggerImport(modified, filePath);
  }

  return { content: modified, hasChanges };
}

// Process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = replaceConsoleCalls(content, filePath);

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`âœ“ Processed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`âœ— Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificFile = args.find(arg => !arg.startsWith('--'));

  console.log('ًں”چ Searching for console.* calls...\n');

  let filesToProcess = [];

  if (specificFile) {
    // Process specific file
    if (fs.existsSync(specificFile)) {
      filesToProcess = [specificFile];
    } else {
      console.error(`File not found: ${specificFile}`);
      process.exit(1);
    }
  } else {
    // Process all files
    const srcDir = path.join(process.cwd(), 'src');
    if (!fs.existsSync(srcDir)) {
      console.error('src directory not found');
      process.exit(1);
    }
    filesToProcess = getAllFiles(srcDir);
  }

  console.log(`Found ${filesToProcess.length} files to check\n`);

  let processedCount = 0;
  let changedCount = 0;

  filesToProcess.forEach(filePath => {
    processedCount++;
    const content = fs.readFileSync(filePath, 'utf8');
    const { hasChanges } = replaceConsoleCalls(content, filePath);

    if (hasChanges) {
      changedCount++;
      if (dryRun) {
        console.log(`[DRY RUN] Would process: ${filePath}`);
      } else {
        processFile(filePath);
      }
    }
  });

  console.log(`\nâœ… Processed ${processedCount} files`);
  console.log(`ًں“‌ ${changedCount} files would be modified`);

  if (dryRun) {
    console.log('\nًں’، Run without --dry-run to apply changes');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { replaceConsoleCalls, processFile, getAllFiles };

