import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Hard limits — the endpoint is unauthenticated by design (the metric
// beacons fire from every visitor), so we MUST defend against both
// malicious traffic and accidental abuse (a runaway loop, a bot, a
// misconfigured CDN replaying old bodies).
//
//   - `MAX_BODY_BYTES` caps the request body before JSON parsing. The
//     real `web-vitals` payload is < 1 KB; 4 KB is a generous ceiling.
//   - `MAX_METRICS_PER_REQUEST` caps the array length so a single bad
//     request can't allocate an unbounded list.
//   - The Zod schema below enforces field-level bounds (string length,
//     number finiteness) so a hostile payload can't smuggle a 10 MB
//     `id` or a NaN `value` past the parser.
const MAX_BODY_BYTES = 4 * 1024;
const MAX_METRICS_PER_REQUEST = 20;

// Field-level whitelist. Anything outside this enum is rejected —
// `web-vitals` 5.x only ever emits one of these names.
const METRIC_NAMES = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB', 'FID'] as const;

// `rating` is a derived field on every metric; it's not required but if
// present it must be one of these three values.
const METRIC_RATINGS = ['good', 'needs-improvement', 'poor'] as const;

// Navigation types — bounded list. `web-vitals` emits one of these.
const NAVIGATION_TYPES = ['navigate', 'reload', 'back-forward', 'prerender'] as const;

const metricSchema = z.object({
  // The metric name (one of the core Web Vitals).
  name: z.enum(METRIC_NAMES),
  // The numeric value reported by the library. Reject NaN/Infinity —
  // these would silently break any aggregation that computes means.
  value: z.number().finite(),
  // A per-metric unique identifier (e.g. "v3-1735123456-1234"). Used
  // for de-duplication server-side. Bound to 100 chars.
  id: z.string().min(1).max(100),
  // Optional rating.
  rating: z.enum(METRIC_RATINGS).optional(),
  // Optional delta (cumulative change since last report).
  delta: z.number().finite().optional(),
  // Optional navigation type.
  navigationType: z.enum(NAVIGATION_TYPES).optional(),
  // Optional URL of the page. Bound to 2 KB; longer URLs are a sign of
  // tampering or a misbehaving client.
  url: z.string().max(2048).optional(),
  // Optional user agent override — almost never needed in practice,
  // and if present we just use the request's User-Agent instead.
});

const payloadSchema = z.union([
  // Some clients send a single metric object.
  metricSchema,
  // Most clients send an array of metric objects.
  z.array(metricSchema).min(1).max(MAX_METRICS_PER_REQUEST),
]);

export async function POST(request: NextRequest) {
  // Cap the request body BEFORE we let JSON.parse allocate it. A
  // well-behaved `web-vitals` beacon is ~250 bytes; we cut anything
  // larger off at 4 KB.
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 },
      );
    }
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (raw.length > MAX_BODY_BYTES) {
    // Defence against a missing/wrong Content-Length header. We use
    // `.length` (UTF-16 code units) as an upper bound — it's at least
    // as restrictive as the byte count for any sane encoding.
    return NextResponse.json(
      { error: 'Payload too large' },
      { status: 413 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = payloadSchema.safeParse(parsed);
  if (!result.success) {
    // Don't echo Zod's full issue tree to the client — it leaks schema
    // shape to a public endpoint. A short generic error is enough.
    return NextResponse.json({ error: 'Invalid metric' }, { status: 400 });
  }

  const metrics = Array.isArray(result.data) ? result.data : [result.data];

  // Sanity-check the metric values against plausible Web Vitals ranges.
  // Anything outside the bounds is rejected — these would be the result
  // of a bug or a malicious payload, and we don't want them in the
  // aggregation pipeline.
  for (const metric of metrics) {
    if (!isPlausibleMetric(metric)) {
      return NextResponse.json(
        { error: 'Implausible metric value' },
        { status: 400 },
      );
    }
  }

  // Structured log so an external collector (Datadog, Loki, etc.) can
  // index by metric name without parsing a free-form string. The
  // `console.log` from the previous implementation was both noisy and
  // unstructured.
  for (const metric of metrics) {
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        source: 'web-vitals',
        name: metric.name,
        value: metric.value,
        id: metric.id,
        rating: metric.rating ?? null,
        delta: metric.delta ?? null,
        navigationType: metric.navigationType ?? null,
        url: metric.url ?? null,
        receivedAt: Date.now(),
      }),
    );
  }

  return NextResponse.json({ status: 'success' }, { status: 200 });
}

/**
 * Reject metrics whose value is outside a sane range. The exact upper
 * bound is intentionally generous (CLS can spike during long-running
 * sessions; LCP can be minutes on a slow 3G connection), but values
 * beyond these bounds are either a measurement bug or a hostile payload.
 */
function isPlausibleMetric(metric: z.infer<typeof metricSchema>): boolean {
  // CLS: layout-shift score. Real-world values top out around 10 even
  // for catastrophic layout instability.
  if (metric.name === 'CLS') return metric.value >= 0 && metric.value <= 100;
  // All other metrics are millisecond durations.
  return metric.value >= 0 && metric.value <= 600_000; // 10 minutes
}
