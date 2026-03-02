const { checkApiDuplicates } = require('./scripts/check-api-duplicates');
const { checkPageDuplicates } = require('./scripts/check-page-duplicates');
const fs = require('fs');

async function run() {
  const apiResult = checkApiDuplicates();
  const pageResult = checkPageDuplicates();
  
  fs.writeFileSync('duplicate-report.json', JSON.stringify({
    api: apiResult,
    page: pageResult
  }, null, 2));
}

run().catch(console.error);
