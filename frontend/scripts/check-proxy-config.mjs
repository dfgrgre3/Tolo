#!/usr/bin/env node
/**
 * Proxy Configuration Diagnostics
 * --------------------------------
 * Verifies that the environment variables required by the API proxy
 * (src/app/api/[...path]/route.ts) are present and look reasonable.
 *
 * Run with:
 *   node scripts/check-proxy-config.mjs
 *
 * Or load a specific env file first:
 *   node --env-file=.env.production scripts/check-proxy-config.mjs
 *   vercel env pull .env.local && node --env-file=.env.local scripts/check-proxy-config.mjs
 */

const VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const NODE_ENV = process.env.NODE_ENV || 'development';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || '';
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function stripApi(url) {
  return url.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

const resolved = stripApi(INTERNAL_API_URL || NEXT_PUBLIC_API_URL);

const lines = [];
const pass = (msg) => lines.push(`✅ ${msg}`);
const fail = (msg) => lines.push(`❌ ${msg}`);
const warn = (msg) => lines.push(`⚠️  ${msg}`);
const info = (msg) => lines.push(`ℹ️  ${msg}`);

info(`Environment: ${NODE_ENV}${VERCEL ? ' (Vercel)' : ''}`);
info(`INTERNAL_API_URL        = ${INTERNAL_API_URL || '(unset)'}`);
info(`NEXT_PUBLIC_API_URL     = ${NEXT_PUBLIC_API_URL || '(unset)'}`);
info(`Resolved BACKEND_URL    = ${resolved || '(empty)'}`);
info('');

if (VERCEL || NODE_ENV === 'production') {
  if (!resolved) {
    fail('No backend URL is configured. The proxy will return 502 / 503 for every /api/* request.');
    fail('Fix: Vercel Dashboard → Project → Settings → Environment Variables, then redeploy.');
  } else if (resolved.includes('127.0.0.1') || resolved.includes('localhost')) {
    fail(`Backend URL points to localhost (${resolved}). This will not work on Vercel.`);
  } else if (!/^https?:\/\//.test(resolved)) {
    fail(`Backend URL is missing protocol: ${resolved}`);
  } else {
    pass(`Backend URL looks valid: ${resolved}`);
  }
} else {
  if (!resolved) {
    warn('No backend URL configured. The dev proxy will fall back to http://127.0.0.1:8082.');
  } else {
    pass(`Dev backend URL: ${resolved}`);
  }
}

console.log(lines.join('\n'));

if (lines.some((l) => l.startsWith('❌'))) {
  process.exitCode = 1;
}
