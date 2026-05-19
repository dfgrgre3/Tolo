import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse, upstreamAuthHeaders } from '../../_utils';

/**
 * POST /api/auth/2fa/verify
 *
 * Proxies 2FA verification to the Go backend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    if (!body || body.trim() === '') {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }

    const targetUrl = `${BACKEND_URL}/api/auth/2fa/verify`;
    console.log(`[API Proxy] POST 2FA verify to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...upstreamAuthHeaders(request),
      },
      body: body,
      credentials: 'include',
    });

    console.log(`[API Proxy] 2FA verify backend status: ${response.status}`);
    return backendJsonResponse(response);
  } catch (error) {
    console.error(`[API Proxy] 2FA verify error connecting to ${BACKEND_URL}:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to authentication service' },
      { status: 502 }
    );
  }
}
