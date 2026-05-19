import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse, upstreamAuthHeaders } from '../_utils';

/**
 * POST /api/auth/admin-login
 *
 * Proxies the request to the Go backend's /api/auth/admin-login endpoint.
 * The backend enforces ADMIN/MODERATOR role check before issuing tokens,
 * returning 403 for any other role.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    if (!body || body.trim() === '') {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }

    try {
      const parsed = JSON.parse(body);
      console.log(`[API Proxy] Admin login attempt for: ${parsed.email}`);
    } catch (e) {
      console.log(`[API Proxy] Failed to parse body for logging: ${e}`);
    }

    const targetUrl = `${BACKEND_URL}/api/auth/admin-login`;
    console.log(`[API Proxy] POST request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...upstreamAuthHeaders(request),
      },
      body: body,
      credentials: 'include',
    });

    console.log(`[API Proxy] Backend responded with status: ${response.status}`);
    return backendJsonResponse(response);
  } catch (error) {
    console.error(`[API Proxy] Admin login error connecting to ${BACKEND_URL}:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to authentication service' },
      { status: 502 }
    );
  }
}
