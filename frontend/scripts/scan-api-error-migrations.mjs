#!/usr/bin/env node
/**
 * Scans codebase for legacy `instanceof ApiError` and status code inspections,
 * suggesting the corresponding canonical domain error from `@/lib/errors/domain-errors`.
 *
 * Usage: node scripts/scan-api-error-migrations.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');
const PATTERN = /instanceof\s+ApiError/g;

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(file)) {
        walk(filePath, fileList);
      }
    } else if (/\.(ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk(SRC_DIR);
const occurrences = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (PATTERN.test(line)) {
      let suggested = 'AppError';
      if (line.includes('401') || line.includes('isUnauthorized')) suggested = 'AuthenticationError';
      else if (line.includes('403') || line.includes('isForbidden')) suggested = 'AuthorizationError';
      else if (line.includes('404') || line.includes('isNotFound')) suggested = 'NotFoundError';
      else if (line.includes('409')) suggested = 'ConflictError';
      else if (line.includes('422') || line.includes('isValidation')) suggested = 'ValidationError';
      else if (line.includes('429') || line.includes('isRateLimited')) suggested = 'RateLimitError';

      const relPath = path.relative(process.cwd(), filePath);
      occurrences.push({
        file: relPath,
        line: idx + 1,
        content: line.trim(),
        suggested,
      });
    }
  });
}

console.log('='.repeat(70));
console.log(`Canonical Error Migration Scanner: ${occurrences.length} legacy references found`);
console.log('='.repeat(70));

const grouped = {};
for (const occ of occurrences) {
  grouped[occ.file] = grouped[occ.file] || [];
  grouped[occ.file].push(occ);
}

for (const [file, items] of Object.entries(grouped)) {
  console.log(`\n📄 ${file}:`);
  for (const item of items) {
    console.log(`   L${item.line}: ${item.content}`);
    console.log(`   👉 Suggested replacement: instanceof ${item.suggested}`);
  }
}

console.log('\n' + '='.repeat(70));
console.log(`Summary: ${occurrences.length} call sites across ${Object.keys(grouped).length} files.`);
console.log('Legacy ApiError is preserved as a compatible base class during migration.');
console.log('='.repeat(70));
