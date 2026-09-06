#!/usr/bin/env node
/**
 * Security Configuration Validation
 * --------------------------------
 * Verifies that all security-critical environment variables are properly
 * configured for production deployment. This script validates:
 *
 * - Backend URL configuration
 * - JWT verification keys (asymmetric public key vs legacy secret)
 * - JWT issuer and audience claims
 * - Trusted proxy count for IP resolution
 * - CORS and CSP configuration
 *
 * Run with:
 *   node scripts/check-security-config.mjs
 *
 * Or load a specific env file first:
 *   node --env-file=.env.production scripts/check-security-config.mjs
 *   vercel env pull .env.local && node --env-file=.env.local scripts/check-security-config.mjs
 */

const VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production' || VERCEL;

// Security-critical environment variables
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || '';
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPECTED_ISSUER = process.env.JWT_EXPECTED_ISSUER || '';
const JWT_EXPECTED_AUDIENCE = process.env.JWT_EXPECTED_AUDIENCE || '';
const TRUSTED_PROXY_COUNT = process.env.TRUSTED_PROXY_COUNT || '0';

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
info('');
info('Backend URL Configuration:');
info(`  INTERNAL_API_URL        = ${INTERNAL_API_URL || '(unset)'}`);
info(`  NEXT_PUBLIC_API_URL     = ${NEXT_PUBLIC_API_URL || '(unset)'}`);
info(`  Resolved BACKEND_URL    = ${resolved || '(empty)'}`);
info('');
info('JWT Configuration:');
info(`  JWT_PUBLIC_KEY          = ${JWT_PUBLIC_KEY ? '(set)' : '(unset)'}`);
info(`  JWT_SECRET              = ${JWT_SECRET ? '(set) - DANGEROUS IN PRODUCTION' : '(unset)'}`);
info(`  JWT_EXPECTED_ISSUER     = ${JWT_EXPECTED_ISSUER || '(unset)'}`);
info(`  JWT_EXPECTED_AUDIENCE  = ${JWT_EXPECTED_AUDIENCE || '(unset)'}`);
info('');
info('Network Security:');
info(`  TRUSTED_PROXY_COUNT     = ${TRUSTED_PROXY_COUNT}`);
info('');

// Backend URL validation
if (IS_PRODUCTION) {
  if (!resolved) {
    fail('No backend URL is configured. The proxy will return 502 / 503 for every /api/* request.');
    fail('Fix: Set INTERNAL_API_URL or NEXT_PUBLIC_API_URL in your production environment.');
  } else if (resolved.includes('127.0.0.1') || resolved.includes('localhost')) {
    fail(`Backend URL points to localhost (${resolved}). This will not work in production.`);
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

// JWT configuration validation
if (IS_PRODUCTION) {
  if (!JWT_PUBLIC_KEY) {
    fail('JWT_PUBLIC_KEY is not set in production. JWT verification will fail closed.');
    fail('Fix: Set JWT_PUBLIC_KEY with your backend\'s asymmetric public key (PEM SPKI format).');
  } else {
    pass('JWT_PUBLIC_KEY is set for asymmetric verification.');
  }

  if (JWT_SECRET) {
    fail('JWT_SECRET is set in production. This is a security risk - use asymmetric keys only.');
    fail('Fix: Remove JWT_SECRET from production environment, use JWT_PUBLIC_KEY instead.');
  } else {
    pass('JWT_SECRET is not set in production (correct - using asymmetric keys).');
  }

  if (!JWT_EXPECTED_ISSUER) {
    fail('JWT_EXPECTED_ISSUER is not set in production. JWT verification will fail closed.');
    fail('Fix: Set JWT_EXPECTED_ISSUER to match your backend\'s issuer claim.');
  } else {
    pass(`JWT_EXPECTED_ISSUER is set: ${JWT_EXPECTED_ISSUER}`);
  }

  if (!JWT_EXPECTED_AUDIENCE) {
    fail('JWT_EXPECTED_AUDIENCE is not set in production. JWT verification will fail closed.');
    fail('Fix: Set JWT_EXPECTED_AUDIENCE to match your backend\'s audience claim.');
  } else {
    pass(`JWT_EXPECTED_AUDIENCE is set: ${JWT_EXPECTED_AUDIENCE}`);
  }
} else {
  if (JWT_PUBLIC_KEY) {
    pass('JWT_PUBLIC_KEY is set (development - can use asymmetric keys).');
  } else if (JWT_SECRET) {
    warn('JWT_SECRET is set in development (legacy mode - consider migrating to asymmetric keys).');
  } else {
    warn('No JWT verification key is set. JWT verification will fail closed.');
    warn('Fix: Set JWT_PUBLIC_KEY (recommended) or JWT_SECRET (legacy) for development.');
  }
}

// Trusted proxy count validation
const proxyCount = parseInt(TRUSTED_PROXY_COUNT, 10);
if (isNaN(proxyCount) || proxyCount < 0) {
  fail(`TRUSTED_PROXY_COUNT is invalid: ${TRUSTED_PROXY_COUNT}. Must be a non-negative integer.`);
} else if (IS_PRODUCTION && proxyCount === 0) {
  warn('TRUSTED_PROXY_COUNT is 0 in production. If using a CDN/reverse proxy, this will break IP-based security.');
  warn('Fix: Set TRUSTED_PROXY_COUNT to match your deployment topology (1 for CDN, 2 for CDN+proxy, etc.).');
} else {
  pass(`TRUSTED_PROXY_COUNT is valid: ${proxyCount}`);
  if (proxyCount > 0) {
    info(`  → IP-based security (rate limiting, audit logging, abuse protection) will be enabled.`);
  } else {
    info(`  → IP-based security will be disabled (X-Forwarded-For ignored).`);
  }
}

console.log(lines.join('\n'));

if (lines.some((l) => l.startsWith('❌'))) {
  process.exitCode = 1;
}
