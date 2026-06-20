import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function getClerkDomain(): string {
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.replace(/['"]/g, '').trim();
  if (!pubKey) {
    console.warn('[__clerk proxy] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined, using fallback');
    return 'frontend-api.clerk.services';
  }

  try {
    const parts = pubKey.split('_');
    const base64Part = parts[2] || parts[parts.length - 1];
    if (!base64Part) {
      return 'frontend-api.clerk.services';
    }

    let decoded = atob(base64Part);
    if (decoded.endsWith('$')) {
      decoded = decoded.slice(0, -1);
    }
    return decoded.trim();
  } catch (err) {
    console.error('[__clerk proxy] Failed to parse publishable key:', err);
    return 'frontend-api.clerk.services';
  }
}

/**
 * Universal Clerk proxy route.
 *
 * Handles TWO types of requests:
 *   1. npm bundle requests (/__clerk/npm/@clerk/<pkg>/dist/<bundle>.js)
 *      → proxied to jsDelivr CDN with correct MIME type
 *   2. Clerk frontend API requests (/__clerk/v1/..., /__clerk/oauth/..., etc.)
 *      → proxied to frontend-api.clerk.services
 *
 * Previously, the Clerk API proxy was implemented as a Next.js rewrite in
 * next.config.js that pointed to frontend-api.clerk.services externally.
 * However, on Windows dev machines and some Vercel deployments, the external
 * rewrite triggered SSL handshake failures (EPROTO / SSL alert number 40).
 *
 * By converting to a local route handler:
 *   - No external SSL handshake at the Edge/rewrite layer
 *   - The proxy runs as first-party JavaScript with full error handling
 *   - Correct MIME types are enforced for JS bundles
 *   - Caching headers are forwarded properly
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;

  // ── Route: npm bundle → jsDelivr CDN ──────────────────────────────────
  if (path[0] === 'npm') {
    // path is like ['npm', '@clerk', 'ui@1', 'dist', 'ui.browser.js']
    // We need to skip 'npm' and join the rest
    const pkgRest = path.slice(1).join('/');
    // Remove leading '@clerk/' if present since we're already adding it
    const cleanPkgRest = pkgRest.replace(/^@clerk\//, '');
    const upstreamUrl = `https://cdn.jsdelivr.net/npm/@clerk/${cleanPkgRest}${search}`;

    console.log(`[__clerk proxy] npm → ${upstreamUrl}`);

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/javascript, */*',
          'Accept-Encoding': 'gzip, br',
        },
        redirect: 'follow',
      });

      if (!upstream.ok) {
        const domain = getClerkDomain();
        const fallbackUrl = `https://${domain}/${reqPath}${search}`;
        console.log(`[__clerk proxy] npm (jsdelivr returned ${upstream.status}) → falling back to Clerk API: ${fallbackUrl}`);
        upstream = await fetch(fallbackUrl, {
          headers: {
            'Accept': 'application/javascript, */*',
            'Accept-Encoding': 'gzip, br',
            ...(_req.headers.get('cookie') && { 'Cookie': _req.headers.get('cookie')! }),
          },
          redirect: 'follow',
        });
      }
    } catch (err) {
      console.error('[__clerk proxy] npm fetch failed:', err);
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Upstream fetch failed');
      return NextResponse.json(
        { error: errorText, upstreamStatus: upstream.status },
        { status: upstream.status }
      );
    }

    const body = await upstream.arrayBuffer();

    const headers = new Headers();
    headers.set('Content-Type', 'application/javascript; charset=utf-8');
    headers.set('X-Content-Type-Options', 'nosniff');

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

  // ── Route: Clerk frontend API ────────────────────────────────────────
  const domain = getClerkDomain();
  const upstreamUrl = `https://${domain}/${reqPath}${search}`;

  console.log(`[__clerk proxy] api → ${upstreamUrl}`);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, br',
        // Forward cookie if present (Clerk uses cookies for session)
        ...(_req.headers.get('cookie') && { 'Cookie': _req.headers.get('cookie')! }),
      },
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[__clerk proxy] API fetch failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Upstream fetch failed');
    return NextResponse.json(
      { error: errorText, upstreamStatus: upstream.status },
      { status: upstream.status }
    );
  }

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  // Forward Content-Type from upstream (it's usually application/json)
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  } else {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  // Forward Set-Cookie from upstream (Clerk sets session cookies)
  const setCookie = upstream.headers.get('Set-Cookie');
  if (setCookie) headers.set('Set-Cookie', setCookie);

  // Forward caching headers
  const cacheControl = upstream.headers.get('Cache-Control');
  if (cacheControl) headers.set('Cache-Control', cacheControl);

  const etag = upstream.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  return new NextResponse(body, { status: upstream.status, headers });
}

// Clerk sometimes uses POST for API requests (e.g., sign-in, sign-up)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;
  const domain = getClerkDomain();
  const upstreamUrl = `https://${domain}/${reqPath}${search}`;

  console.log(`[__clerk proxy] POST → ${upstreamUrl}`);

  let upstream: Response;
  try {
    const requestBody = await _req.text();
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': _req.headers.get('Content-Type') || 'application/json',
        'Accept': '*/*',
        ...(_req.headers.get('cookie') && { 'Cookie': _req.headers.get('cookie')! }),
      },
      body: requestBody,
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[__clerk proxy] POST fetch failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Upstream fetch failed');
    return NextResponse.json(
      { error: errorText, upstreamStatus: upstream.status },
      { status: upstream.status }
    );
  }

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const setCookie = upstream.headers.get('Set-Cookie');
  if (setCookie) headers.set('Set-Cookie', setCookie);

  return new NextResponse(body, { status: upstream.status, headers });
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;
  const domain = getClerkDomain();
  const upstreamUrl = `https://${domain}/${reqPath}${search}`;

  let upstream: Response;
  try {
    const requestBody = await _req.text();
    upstream = await fetch(upstreamUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': _req.headers.get('Content-Type') || 'application/json',
        'Accept': '*/*',
        ...(_req.headers.get('cookie') && { 'Cookie': _req.headers.get('cookie')! }),
      },
      body: requestBody,
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[__clerk proxy] PUT fetch failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Upstream fetch failed');
    return NextResponse.json(
      { error: errorText, upstreamStatus: upstream.status },
      { status: upstream.status }
    );
  }

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);

  const setCookie = upstream.headers.get('Set-Cookie');
  if (setCookie) headers.set('Set-Cookie', setCookie);

  return new NextResponse(body, { status: upstream.status, headers });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;
  const domain = getClerkDomain();
  const upstreamUrl = `https://${domain}/${reqPath}${search}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'DELETE',
      headers: {
        'Accept': '*/*',
        ...(_req.headers.get('cookie') && { 'Cookie': _req.headers.get('cookie')! }),
      },
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[__clerk proxy] DELETE fetch failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Upstream fetch failed');
    return NextResponse.json(
      { error: errorText, upstreamStatus: upstream.status },
      { status: upstream.status }
    );
  }

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);

  const setCookie = upstream.headers.get('Set-Cookie');
  if (setCookie) headers.set('Set-Cookie', setCookie);

  return new NextResponse(body, { status: upstream.status, headers });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;
  const domain = getClerkDomain();
  const upstreamUrl = `https://${domain}/${reqPath}${search}`;

  let upstream: Response;
  try {
    const requestBody = await _req.text();
    upstream = await fetch(upstreamUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': _req.headers.get('Content-Type') || 'application/json',
        'Accept': '*/*',
        ...(_req.headers.get('cookie') && { 'Cookie': _req.headers.get('cookie')! }),
      },
      body: requestBody,
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[__clerk proxy] PATCH fetch failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Upstream fetch failed');
    return NextResponse.json(
      { error: errorText, upstreamStatus: upstream.status },
      { status: upstream.status }
    );
  }

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);

  const setCookie = upstream.headers.get('Set-Cookie');
  if (setCookie) headers.set('Set-Cookie', setCookie);

  return new NextResponse(body, { status: upstream.status, headers });
}

export async function OPTIONS(_req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', _req.headers.get('origin') || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return new NextResponse(null, { status: 204, headers });
}