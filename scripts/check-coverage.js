const fs = require('fs');
const path = require('path');

// Define the base directory (project root)
const PROJECT_ROOT = path.resolve(__dirname, '..');
// Define the allowed coverage directory
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');

// Construct the coverage file path
const coverageFilePath = path.join(COVERAGE_DIR, 'coverage-summary.json');
// Normalize the path to remove any '..' or '.' segments
const COVERAGE_FILE = path.normalize(coverageFilePath);

const MIN_COVERAGE = 80;

// Security validation: Ensure the resolved path is within the coverage directory
if (!COVERAGE_FILE.startsWith(COVERAGE_DIR)) {
  console.error('❌ مسار ملف التغطية غير صالح - محاولة الوصول خارج الدليل المسموح');
  process.exit(1);
}

// Validate the file exists
if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('❌ ملف التغطية غير موجود، يرجى تشغيل الاختبارات أولاً');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(COVERAGE_FILE));
const coverage = report.total.lines.pct;

if (coverage < MIN_COVERAGE) {
  console.error(`❌ التغطية الحالية ${coverage}% أقل من ${MIN_COVERAGE}% المطلوبة`);
  process.exit(1);
}

console.log(`✅ التغطية ${coverage}% مقبولة`);
process.exit(0);
