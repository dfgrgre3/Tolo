import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const envPath = path.join('frontend', '.env');
const content = fs.readFileSync(envPath, 'utf8');

const lines = content.split(/\r?\n/);
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;

  const key = trimmed.substring(0, eqIdx).trim();
  let value = trimmed.substring(eqIdx + 1).trim();

  // Strip wrapping quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.substring(1, value.length - 1);
  }

  // Handle escape sequences like \n in PEM key
  value = value.replace(/\\n/g, '\n');

  console.log(`Syncing ${key}...`);

  // Remove if exists
  try {
    execSync(`vercel env rm ${key} production -y --non-interactive`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore error if variable doesn't exist
  }

  // Add new value
  try {
    const proc = execSync(`vercel env add ${key} production --non-interactive`, {
      input: value,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`Successfully added ${key}`);
  } catch (err) {
    console.error(`Failed to add ${key}:`, err.message, err.stderr?.toString());
  }
}
