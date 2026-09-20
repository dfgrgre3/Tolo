import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { resolveTrustedClientIp } from '@/lib/security/policy/auth-policy';
import { getRedisClientAsync } from '@/lib/redis/client';

// CSP reports are small (<2 KB in practice). Anything bigger is abuse or
// a misuse of the endpoint — reject before parsing so attackers can't
// tie up serverless CPU on multi-MB bodies.
const MAX_CSP_BODY_BYTES = 16 * 1024; // 16 KB hard cap

// Per-IP token bucket. CSP reports are POST-only and browser-driven,
// so a real user triggers <1/min. Sustained traffic from one IP is
// either a misconfigured extension or an attacker spamming the route.
//
// The bucket lives in Redis (shared across serverless instances) with the
// in-memory map below as fallback when Redis is disabled/unreachable —
// so a Redis outage degrades to per-instance limiting, never to open abuse.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX = 10;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

// Production samples 10% of reports. Sampling is deterministic by IP so
// the same offender is always either fully sampled or never sampled —
// avoiding partial visibility that hides an active attack.
const SAMPLE_RATE_PROD = 0.1;

// Deterministic FNV-1a hash mapped to [0, 1) — stable per key so the
// sampling decision below is reproducible for the same offender.
function hashToUnitInterval(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function clientIp(request: NextRequest): string | null {
  return resolveTrustedClientIp(request) || null;
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) return false;
  return true;
}

/**
 * Distributed variant of the token bucket: INCR + first-hit EXPIRE keeps
 * the 10/minute budget global across instances. Any Redis failure (or a
 * disabled/missing REDIS_URL) returns null so the caller falls back to the
 * process-local bucket above instead of failing the request.
 */
async function rateLimitDistributed(ip: string): Promise<boolean | null> {
  let redis: Awaited<ReturnType<typeof getRedisClientAsync>>;
  try {
    redis = await getRedisClientAsync();
  } catch {
    return null;
  }
  if (!redis) return null;
  const key = `csp:rl:${ip}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_S);
    }
    return count <= RATE_LIMIT_MAX;
  } catch {
    return null;
  }
}

// Bound the in-memory map: cap at 10k entries and evict the oldest
// expired bucket. Without this a flood of distinct IPs would OOM.
function maybeEvict(): void {
  if (rateLimitBuckets.size < 10_000) return;
  const now = Date.now();
  for (const [key, value] of rateLimitBuckets) {
    if (value.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

// Trim `script-sample` (can contain reflected user input) and
// `original-policy` (full CSP string, useless for monitoring) before
// sending anything off-host. Keep only the fields an analyst needs
// to confirm a violation actually happened.
function extractCspReport(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null;
  // CSP reports arrive as either { "csp-report": {...} } or, when sent
  // via the Reporting-API, a bare object. Handle both.
  const r = (raw as Record<string, unknown>)['csp-report'];
  const report = (r && typeof r === 'object' ? r : raw) as Record<string, unknown>;

  const trimmedString = (v: unknown, maxLen = 256): string | undefined => {
    if (typeof v !== 'string') return undefined;
    return v.length > maxLen ? v.substring(0, maxLen) + '…' : v;
  };

  const out: Record<string, string> = {};
  const doc = trimmedString(report['document-uri']);
  const violated = trimmedString(report['violated-directive']);
  const blocked = trimmedString(report['blocked-uri']);
  const line = report['line-number'];
  const source = trimmedString(report['source-file']);
  if (doc) out['document-uri'] = doc;
  if (violated) out['violated-directive'] = violated;
  if (blocked) out['blocked-uri'] = blocked;
  if (typeof line === 'number') out['line-number'] = String(line);
  if (source) out['source-file'] = source;
  return Object.keys(out).length > 0 ? out : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Body-size guard — reject before parsing.
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!Number.isNaN(bytes) && bytes > MAX_CSP_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }
  }

  // 2. Rate-limit per IP — distributed (Redis) first, process-local fallback.
  const ip = clientIp(request);
  // There is no trustworthy per-client identity when neither a configured
  // proxy chain nor a platform IP header is available. Do not put all such
  // clients in a shared bucket; fail closed for this observability endpoint.
  if (!ip) {
    return NextResponse.json({ success: false }, { status: 429 });
  }
  const distributed = await rateLimitDistributed(ip);
  const allowed = distributed ?? rateLimit(ip);
  if (!allowed) {
    maybeEvict();
    return NextResponse.json({ success: false }, { status: 429 });
  }
  maybeEvict();

  // 3. Parse + extract a minimal, scrubbed record.
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    // Malformed JSON — silently 204 so browsers don't retry.
    return new NextResponse(null, { status: 204 });
  }

  const record = extractCspReport(payload);
  if (!record) {
    return new NextResponse(null, { status: 204 });
  }

  // 4. Sample in production. Dev keeps 100% so the developer sees their
  //    own violations immediately. The sample key includes the violated
  //    directive so one noisy rule cannot starve every other signal from
  //    the same IP.
  if (process.env.NODE_ENV === 'production') {
    const sampleKey = `${ip}:${record['violated-directive'] ?? ''}`;
    if (hashToUnitInterval(sampleKey) > SAMPLE_RATE_PROD) {
      return new NextResponse(null, { status: 204 });
    }
  }

  // 5. Structured log — only the trimmed record, no raw JSON to stdout.
  //    Sentry breadcrumb (not exception) so it groups under the active
  //    error context if one exists, but does not page anyone.
  Sentry.addBreadcrumb({
    category: 'csp',
    type: 'warning',
    level: 'warning',
    message: 'CSP violation',
    data: { ip, ...record },
    timestamp: Date.now() / 1000,
  });

  // Always respond 204 — the W3C spec says report-uri must not return a
  // body, and a quick 204 short-circuits any retry logic in the browser.
  return new NextResponse(null, { status: 204 });
}
