import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log(`[API Proxy] Login request body size: ${body.length} bytes`);

    if (!body || body.trim() === '') {
       return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }

    try {
      const parsed = JSON.parse(body);
      console.log(`[API Proxy] Proxying login for: ${parsed.email}`);
    } catch (e) {
      console.log(`[API Proxy] Failed to parse body for logging: ${e}`);
    }

    // Use /api/auth/login relative to the base URL
    const targetUrl = `${BACKEND_URL}/api/auth/login`;
    console.log(`[API Proxy] POST request to: ${targetUrl}`);

    // Forward relevant headers including cookies for CSRF/Session
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-CSRF-Token': request.headers.get('x-csrf-token') || '',
      },
      body: body,
      credentials: 'include',
    });

    console.log(`[API Proxy] Backend responded with status: ${response.status}`);
    return backendJsonResponse(response);
  } catch (error) {
    console.error(`[API Proxy] Login error connecting to ${BACKEND_URL}:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to authentication service' },
      { status: 502 }
    );
  }
}
