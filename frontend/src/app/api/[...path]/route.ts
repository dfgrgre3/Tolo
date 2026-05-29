import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082').replace(/\/api$/, '').replace(/\/+$/, '');
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
type StreamingRequestInit = RequestInit & { duplex?: 'half' };

function upstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  
  const auth = request.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  
  const cookie = request.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (ip) headers['x-forwarded-for'] = ip;
  
  // Forward CSRF token
  const csrf = request.headers.get('x-csrf-token');
  if (csrf) headers['X-CSRF-Token'] = csrf;
  
  // Forward content type
  const ct = request.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;
  
  return headers;
}

function buildProxyRequestOptions(request: NextRequest, headers: Record<string, string>): StreamingRequestInit {
  const options: StreamingRequestInit = {
    method: request.method,
    headers: { ...headers },
    duplex: 'half',
  };

  if (METHODS_WITH_BODY.has(request.method) && request.body) {
    options.body = request.body;
  }

  return options;
}

function copyResponseHeaders(response: Response, defaultCacheControl?: string): Headers {
  const responseHeaders = new Headers();
  const excludeHeaders = [
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-encoding', 'content-length'
  ];

  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'set-cookie') return;
    if (!excludeHeaders.includes(lowerKey)) {
      responseHeaders.set(key, value);
    }
  });

  if (response.headers.has('set-cookie')) {
    const setCookieHeaders = typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean) as string[];

    setCookieHeaders.forEach((cookieVal: string) => {
      responseHeaders.append('Set-Cookie', cookieVal);
    });
  }

  if (!responseHeaders.has('content-type')) {
    responseHeaders.set('content-type', response.headers.get('content-type') || 'application/json');
  }

  if (defaultCacheControl && !responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', response.headers.get('cache-control') || defaultCacheControl);
  }

  return responseHeaders;
}

function handleErrorResponse(response: Response, errorText: string) {
  let errorData;
  try {
    errorData = JSON.parse(errorText);
    // Ensure we always have an error field
    if (!errorData.error && errorData.message) {
      errorData.error = errorData.message;
    }
    if (!errorData.error && errorData.msg) {
      errorData.error = errorData.msg;
    }
    if (!errorData.error) {
      errorData.error = `Backend error (HTTP ${response.status})`;
    }
  } catch {
    errorData = { 
      error: response.status === 404 ? 'Resource not found on backend' : 'Backend error',
      status: response.status,
      details: errorText.substring(0, 500)
    };
  }
  // Always include status in response
  errorData.status = response.status;

  const responseHeaders = copyResponseHeaders(response);

  return NextResponse.json(errorData, { 
    status: response.status,
    headers: responseHeaders
  });
}

async function handleProxy(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  const params = await props.params;
  const path = params.path.join('/');
  const { search } = new URL(request.url);
  const headers = upstreamHeaders(request);
  const options = buildProxyRequestOptions(request, headers);

  try {
    const targetUrl = `${BACKEND_URL}/api/${path}${search}`;
    console.log(`[API Proxy] ${request.method} /api/${path} -> ${targetUrl}`);

    const response = await fetch(targetUrl, {
      ...options,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Proxy] Backend (${response.status}) for ${path}:`, errorText.substring(0, 200));

      return handleErrorResponse(response, errorText);
    }

    const responseHeaders = copyResponseHeaders(response, 'no-store');

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.warn(`[API Proxy] Attempt failed for ${BACKEND_URL}:`, error.message);
    return NextResponse.json(
      { error: 'Failed to connect to backend service', details: error?.message },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
