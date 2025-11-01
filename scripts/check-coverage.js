const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const MIN_COVERAGE = 80;

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
