const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const rootArg = args.find((arg) => !arg.startsWith('--'));
const ROOT = rootArg ? path.resolve(rootArg) : process.cwd();
const DRY_RUN = args.includes('--dry-run');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.txt', '.ps1']);
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', '.turbo', '.venv']);
const EXCLUDE_FILES = new Set([path.resolve(__filename)]);
const MOJIBAKE_PATTERNS = [
  /(?:ط·[ط§ط£ط¥ط¢ط،ظˆظٹظ‡ط©]|ط¸[ط§ط£ط¥ط¢ط،ظˆظٹظ‡ط©]|ط·[^\u0600-\u06FF]|ط¸[^\u0600-\u06FF])/,
  /[أکأ™][^ \t\r\n]/,
  /[أ¢أ£أ¤أ¥أ¦أ§أ¨أ©أھأ«أ¬أ­أ®أ¯أ±أ²أ³أ´أµأ¶أ¹أ؛أ»أ¼أ½أ؟]/,
];

function shouldSkipDir(name) {
  return EXCLUDE_DIRS.has(name);
}

function isTextFile(filePath) {
  return EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function scoreText(text) {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const mojibake = (text.match(/[ط·ط¸ظ€أکأ™أ¢أ£أ¤أ¥أ¦أ§أ¨أ©أھأ«أ¬أ­أ®أ¯أ±أ²أ³أ´أµأ¶أ¹أ؛أ»أ¼أ½أ؟]/g) || []).length;
  return arabic * 2 - mojibake * 3;
}

function hasMojibakePattern(text) {
  return MOJIBAKE_PATTERNS.some((pattern) => pattern.test(text));
}

function tryFixLine(line) {
  if (!hasMojibakePattern(line)) return line;
  const arabicBefore = (line.match(/[\u0600-\u06FF]/g) || []).length;
  const mojibakeBefore = (line.match(/[ط·ط¸ظ€أکأ™أ¢أ£أ¤أ¥أ¦أ§أ¨أ©أھأ«أ¬أ­أ®أ¯أ±أ²أ³أ´أµأ¶أ¹أ؛أ»أ¼أ½أ؟]/g) || []).length;
  if (mojibakeBefore < 2) return line;
  if (mojibakeBefore <= arabicBefore * 0.35) return line;

  try {
    const fixed = Buffer.from(line, 'latin1').toString('utf8');
    const arabicAfter = (fixed.match(/[\u0600-\u06FF]/g) || []).length;
    const mojibakeAfter = (fixed.match(/[ط·ط¸ظ€]/g) || []).length;
    const scoreBefore = scoreText(line);
    const scoreAfter = scoreText(fixed);

    if (
      fixed !== line &&
      scoreAfter >= scoreBefore + 2 &&
      arabicAfter >= arabicBefore &&
      mojibakeAfter < mojibakeBefore
    ) {
      return fixed;
    }
  } catch {
    // ignore
  }
  return line;
}

function fixContent(content) {
  const lines = content.split(/\r?\n/);
  let changed = false;
  const fixedLines = lines.map((line) => {
    const fixed = tryFixLine(line);
    if (fixed !== line) changed = true;
    return fixed;
  });

  return { changed, content: fixedLines.join('\n'), mode: 'line-level' };
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkipDir(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !isTextFile(fullPath)) continue;
    if (EXCLUDE_FILES.has(path.resolve(fullPath))) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    if (!hasMojibakePattern(content)) continue;

    const result = fixContent(content);
    if (!result.changed) continue;

    console.log(`${DRY_RUN ? '[dry-run] ' : '[fix] '}${path.relative(ROOT, fullPath)} (${result.mode})`);
    if (!DRY_RUN) {
      fs.writeFileSync(fullPath, result.content, 'utf8');
    }
  }
}

try {
  walk(ROOT);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
