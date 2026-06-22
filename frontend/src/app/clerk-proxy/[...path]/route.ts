import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 30;

function getClerkDomain(): string {
  // Prefer the explicit frontend API URL if available (most reliable).
  const explicit = process.env.CLERK_FRONTEND_API?.replace(/['"]/g, '').trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      return url.hostname;
    } catch {
      // If it's not a valid URL, fall through to publishable key parsing
    }
  }

  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.replace(/['"]/g, '').trim();
  if (!pubKey) {
    console.warn('[__clerk proxy] Neither CLERK_FRONTEND_API nor NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is defined, using fallback');
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

interface ClerkFetchResult {
  response: Response;
  fallbackDomain?: string;
}

function cleanSearchQuery(search: string): string {
  if (!search) return '';
  try {
    const params = new URLSearchParams(search);
    params.delete('path');
    const cleaned = params.toString();
    return cleaned ? `?${cleaned}` : '';
  } catch (e) {
    console.error('[__clerk proxy] Failed to parse search query:', e);
    return search;
  }
}

/**
 * Common fetch helper that requests Clerk frontend API, handles timeouts, and implements fallbacks.
 */
async function clerkFetch(
  method: string,
  reqPath: string,
  search: string,
  req: NextRequest,
  body?: string
): Promise<ClerkFetchResult> {
  const domain = getClerkDomain();
  const cleanedSearch = cleanSearchQuery(search);
  const upstreamUrl = `https://${domain}/${reqPath}${cleanedSearch}`;

  // Build headers — forward everything Clerk needs to validate the request.
  // Missing Origin/Referer/Authorization headers cause Clerk to return 400 Bad Request.
  const headersInit: Record<string, string> = {
    'Accept': '*/*',
    // Tell Clerk where this request originates from (required for CORS + CSRF validation)
    'Origin': req.headers.get('origin') || req.nextUrl.origin,
    'Referer': req.headers.get('referer') || req.nextUrl.origin,
  };

  const cookies = req.headers.get('cookie');
  const contentType = req.headers.get('content-type');
  const userAgent = req.headers.get('user-agent');
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
  const authorization = req.headers.get('authorization');

  if (cookies) headersInit['Cookie'] = cookies;
  if (contentType) headersInit['Content-Type'] = contentType;
  if (userAgent) headersInit['User-Agent'] = userAgent;
  if (authorization) headersInit['Authorization'] = authorization;
  if (clientIp) {
    headersInit['X-Forwarded-For'] = clientIp;
    headersInit['X-Real-IP'] = clientIp;
  }

  // Forward Clerk-specific custom headers if present
  for (const header of ['clerk-db-jwt', 'x-clerk-auth-token', '__clerk_db_jwt']) {
    const val = req.headers.get(header);
    if (val) headersInit[header] = val;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(upstreamUrl, {
      method,
      headers: headersInit,
      body,
      // CRITICAL: Use 'manual' so Clerk's handshake redirects (3xx) are forwarded
      // back to the browser instead of being silently followed by the proxy.
      // Following redirects causes the browser to display /__clerk as a page.
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return { response: res };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[__clerk proxy] Primary fetch failed for ${domain}:`, err);

    // Fallback: try alternative domains
    const fallbackDomains = [
      'frontend-api.clerk.services',
    ];

    for (const fallbackDomain of fallbackDomains) {
      if (fallbackDomain === domain) continue;

      const fallbackUrl = `https://${fallbackDomain}/${reqPath}${cleanedSearch}`;
      console.log(`[__clerk proxy] Trying fallback ${method} → ${fallbackUrl}`);

      const fallbackController = new AbortController();
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 5000);

      try {
        const fallbackRes = await fetch(fallbackUrl, {
          method,
          headers: headersInit,
          body,
          redirect: 'manual',
          signal: fallbackController.signal,
        });
        clearTimeout(fallbackTimeout);
        return { response: fallbackRes, fallbackDomain };
      } catch (fallbackErr) {
        clearTimeout(fallbackTimeout);
        console.error(`[__clerk proxy] Fallback to ${fallbackDomain} failed:`, fallbackErr);
      }
    }
    throw err;
  }
}

/**
 * Builds NextResponse from upstream response, copying cookies, content-type and caching headers.
 */
async function handleUpstreamResponse(result: ClerkFetchResult): Promise<NextResponse> {
  const { response: upstream, fallbackDomain } = result;

  // Collect Set-Cookie headers first — they must be forwarded for BOTH redirect
  // and non-redirect responses. Clerk sets __client_uat on the handshake 302
  // itself, so dropping cookies from redirects causes the loop to repeat.
  const setCookieValues = upstream.headers.getSetCookie?.() ?? [];
  const legacySetCookie = setCookieValues.length === 0
    ? upstream.headers.get('Set-Cookie')
    : null;

  const attachCookies = (headers: Headers) => {
    if (setCookieValues.length > 0) {
      for (const cookie of setCookieValues) {
        headers.append('Set-Cookie', cookie);
      }
    } else if (legacySetCookie) {
      headers.set('Set-Cookie', legacySetCookie);
    }
  };

  // CRITICAL: Handle Clerk's handshake redirects (3xx) — forward the Location header
  // AND any Set-Cookie headers directly to the browser.
  // With redirect:'manual', fetch returns an "opaqueredirect" response for 3xx.
  const isRedirect = upstream.status === 0 ||
    (upstream.status >= 300 && upstream.status < 400);

  if (isRedirect) {
    const location = upstream.headers.get('Location');
    if (location) {
      const redirectHeaders = new Headers();
      attachCookies(redirectHeaders);
      redirectHeaders.set('Location', location);
      redirectHeaders.set('Cache-Control', 'no-store, max-age=0');
      if (fallbackDomain) redirectHeaders.set('X-Clerk-Proxy-Fallback', fallbackDomain);
      return new NextResponse(null, { status: 302, headers: redirectHeaders });
    }
    // No Location means Clerk issued a redirect without a destination — pass through.
  }

  const headers = new Headers();
  attachCookies(headers);

  if (fallbackDomain) {
    headers.set('X-Clerk-Proxy-Fallback', fallbackDomain);
  }

  // Stream upstream body as-is — DO NOT wrap error responses in a new JSON envelope.
  // Clerk's JS SDK parses the raw upstream body to extract error codes and messages;
  // wrapping it breaks that parsing and causes generic "Bad Request" errors on the client.
  const body = await upstream.arrayBuffer();

  const contentType = upstream.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  } else {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  const cacheControl = upstream.headers.get('Cache-Control');
  if (cacheControl) headers.set('Cache-Control', cacheControl);

  const etag = upstream.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  if (fallbackDomain) {
    headers.set('Cache-Control', 'no-store, max-age=0');
  }

  return new NextResponse(body, { status: upstream.status, headers });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;

  // ── Route: npm bundle → CDN ────────────────────────────────────────────
  if (path[0] === 'npm') {
    const pkgRest = path.slice(1).join('/');
    const cleanPkgRest = pkgRest.replace(/^(npm\/)?@clerk\//, '');
    const jsDelivrUrl = `https://cdn.jsdelivr.net/npm/@clerk/${cleanPkgRest}${search}`;

    console.log(`[__clerk proxy] npm → ${jsDelivrUrl}`);

    let upstream: Response | undefined;
    try {
      upstream = await fetch(jsDelivrUrl, {
        headers: {
          'Accept': 'application/javascript, */*',
        },
        redirect: 'follow',
      });

      // jsDelivr returned an error — try Clerk's own static asset server.
      // @clerk/ui is often served directly from clerk.<instance>.app rather than npm.
      if (!upstream?.ok) {
        console.warn(`[__clerk proxy] jsDelivr returned ${upstream.status}, trying Clerk server`);
        const clerkAssetUrl = `https://${getClerkDomain()}/${reqPath}${search}`;
        console.log(`[__clerk proxy] npm (fallback) → ${clerkAssetUrl}`);
        try {
          upstream = await fetch(clerkAssetUrl, {
            headers: {
              'Accept': 'application/javascript, */*',
            },
            redirect: 'follow',
          });
        } catch (clerkErr) {
          console.error('[__clerk proxy] Clerk fallback fetch failed:', clerkErr);
        }
      }
    } catch (err) {
      console.error('[__clerk proxy] npm fetch failed:', err);
    }

    // If we still don't have a successful response, return a safe plain-text error
    if (!upstream || !upstream.ok) {
      const status = upstream?.status ?? 502;
      const errorText = await upstream?.text().catch(() => 'Not found') ?? 'Upstream fetch failed';
      return new NextResponse(errorText, {
        status,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Verify the response is actually JavaScript — reject HTML/error pages that
    // some CDNs return with status 200 for known-missing assets.
    const contentType = upstream.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');
    const isJavaScript = contentType.includes('javascript') || contentType.includes('octet-stream');
    if (isHtml || !isJavaScript) {
      console.warn(`[__clerk proxy] Expected JS but got ${contentType || 'no content-type'} from ${jsDelivrUrl}`);
      const bodyText = await upstream.text().catch(() => 'Not found');
      return new NextResponse(bodyText, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
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
  try {
    const result = await clerkFetch('GET', reqPath, search, _req);
    return await handleUpstreamResponse(result);
  } catch (err) {
    console.error('[__clerk proxy] GET failed:', err);
    return NextResponse.json({ 
      error: 'Upstream fetch failed',
      path: reqPath,
    }, { status: 502 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;

  try {
    const requestBody = await _req.text();
    const result = await clerkFetch('POST', reqPath, search, _req, requestBody);
    return await handleUpstreamResponse(result);
  } catch (err) {
    console.error('[__clerk proxy] POST failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed', path: reqPath }, { status: 502 });
  }
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;

  try {
    const requestBody = await _req.text();
    const result = await clerkFetch('PUT', reqPath, search, _req, requestBody);
    return await handleUpstreamResponse(result);
  } catch (err) {
    console.error('[__clerk proxy] PUT failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed', path: reqPath }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;

  try {
    const result = await clerkFetch('DELETE', reqPath, search, _req);
    return await handleUpstreamResponse(result);
  } catch (err) {
    console.error('[__clerk proxy] DELETE failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed', path: reqPath }, { status: 502 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const reqPath = path.join('/');
  const { search } = _req.nextUrl;

  try {
    const requestBody = await _req.text();
    const result = await clerkFetch('PATCH', reqPath, search, _req, requestBody);
    return await handleUpstreamResponse(result);
  } catch (err) {
    console.error('[__clerk proxy] PATCH failed:', err);
    return NextResponse.json({ error: 'Upstream fetch failed', path: reqPath }, { status: 502 });
  }
}

export async function OPTIONS(_req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', _req.headers.get('origin') || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return new NextResponse(null, { status: 204, headers });
}