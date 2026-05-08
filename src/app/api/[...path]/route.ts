import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, upstreamAuthHeaders } from '@/app/api/auth/_utils';

/**
 * General API Proxy Catch-all
 * This handles any /api/* routes that don't have a specific route file.
 * It forwards authentication and CSRF tokens to the Go backend.
 */
function getOrigins(primaryOrigin: string): string[] {
  const origins = [primaryOrigin];
  if (primaryOrigin.includes(':8082')) {
    origins.push(primaryOrigin.replace(':8082', ':8080'));
  } else if (primaryOrigin.includes(':8080')) {
    origins.push(primaryOrigin.replace(':8080', ':8082'));
  }
  return origins;
}

async function buildProxyRequestOptions(request: NextRequest, headers: any): Promise<RequestInit> {
  const options: RequestInit = {
    method: request.method,
    headers: { ...headers },
    credentials: 'include',
    // @ts-ignore
    duplex: 'half',
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType) options.headers = { ...options.headers, 'Content-Type': contentType };
    
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 0) {
      options.body = await request.arrayBuffer();
    }
  }

  return options;
}

function handleErrorResponse(response: Response, errorText: string) {
  let errorData;
  try {
    errorData = JSON.parse(errorText);
  } catch {
    errorData = { 
      error: response.status === 404 ? 'Resource not found on backend' : 'Backend error',
      status: response.status,
      details: errorText.substring(0, 500)
    };
  }
  return NextResponse.json(errorData, { status: response.status });
}

async function handleProxy(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const { search } = new URL(request.url);
  const headers = upstreamAuthHeaders(request);
  
  const primaryOrigin = BACKEND_URL.replace(/\/+$/, '');
  const origins = getOrigins(primaryOrigin);
  const options = await buildProxyRequestOptions(request, headers);

  let lastError: any = null;

  for (const origin of origins) {
    try {
      const targetUrl = `${origin}/api/${path}${search}`;
      console.log(`[API Proxy] ${request.method} /api/${path} -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        ...options,
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API Proxy] Backend (${response.status}) for ${path}:`, errorText.substring(0, 200));
        
        // If we get a 404 from one origin, maybe the other one has it? (Only if multiple origins)
        if (response.status === 404 && origins.length > 1 && origin === origins[0]) {
          continue; 
        }

        return handleErrorResponse(response, errorText);
      }

      // Success! Return the response
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
          'Cache-Control': response.headers.get('cache-control') || 'no-store',
        },
      });
    } catch (error: any) {
      console.warn(`[API Proxy] Attempt failed for ${origin}:`, error.message);
      lastError = error;
      continue;
    }
  }

  return NextResponse.json(
    { error: 'Failed to connect to backend service', details: lastError?.message },
    { status: 502 }
  );
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;

