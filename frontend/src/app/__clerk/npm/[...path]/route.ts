import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Proxies Clerk npm bundle requests to jsDelivr CDN.
 *
 * When `proxyUrl = '/__clerk'` is set on ClerkProvider, the Clerk SDK requests
 * its JS bundles from  /__clerk/npm/@clerk/<pkg>@<ver>/dist/<bundle>.js
 *
 * The previous next.config.js rewrite was unreliable on Vercel because:
 *   - Vercel may intercept /__clerk paths at the Edge before Next.js rewrites apply.
 *   - The rewrite proxied to jsDelivr but sometimes returned text/plain MIME type,
 *     causing "Refused to execute script" errors in browsers with strict MIME checking.
 *
 * This API route ensures:
 *   1. The proxy always runs (it's a real Next.js route, not a rewrite).
 *   2. Content-Type is always set to application/javascript.
 *   3. Correct caching headers are forwarded.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pkgPath = path.join('/');
  const upstreamUrl = `https://cdn.jsdelivr.net/npm/@clerk/${pkgPath}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      // Forward caching-friendly headers; do not forward cookies/auth.
      headers: {
        'Accept': 'application/javascript, */*',
        'Accept-Encoding': 'gzip, br',
      },
      // Edge fetch: follow redirects (jsDelivr may redirect to versioned URLs).
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[__clerk/npm proxy] fetch failed:', err);
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(`Upstream returned ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  // Always set the correct MIME type — this is the whole reason this route exists.
  headers.set('Content-Type', 'application/javascript; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');

  // Forward useful caching headers from jsDelivr when present.
  const cacheControl = upstream.headers.get('Cache-Control');
  headers.set(
    'Cache-Control',
    cacheControl ?? 'public, max-age=86400, stale-while-revalidate=604800',
  );

  const etag = upstream.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  const lastModified = upstream.headers.get('Last-Modified');
  if (lastModified) headers.set('Last-Modified', lastModified);

  return new NextResponse(body, { status: 200, headers });
}
