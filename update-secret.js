
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(process.cwd(), '.env');

try {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const newSecret = crypto.randomBytes(64).toString('hex');
  
  // Check if JWT_SECRET exists
  if (envContent.includes('JWT_SECRET=')) {
    // Replace existing
    envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET="${newSecret}"`);
    console.log('Updated existing JWT_SECRET.');
  } else {
    // Append new
    envContent += `\nJWT_SECRET="${newSecret}"\n`;
    console.log('Added new JWT_SECRET.');
  }

  fs.writeFileSync(envPath, envContent);
  console.log('Successfully updated .env file.');
} catch (error) {
  console.error('Error updating .env file:', error);
  process.exit(1);
}
