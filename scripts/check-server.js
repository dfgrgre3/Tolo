// Script to check if server is running before running Lighthouse
const http = require('http');

const url = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';
const maxRetries = 10;
const retryDelay = 1000;

function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (_res) => {
      resolve(true);
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function waitForServer() {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkServer();
      console.log(`âœ“ Server is running on ${url}`);
      return true;
    } catch (_err) {
      if (i < maxRetries - 1) {
        process.stdout.write(`Waiting for server... (${i + 1}/${maxRetries})\r`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`\nâœ— Server is not running on ${url}`);
        console.error(`Please start the server first with: npm run dev`);
        process.exit(1);
      }
    }
  }
}

waitForServer();

