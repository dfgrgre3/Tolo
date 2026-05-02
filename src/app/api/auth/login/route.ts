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
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
      credentials: 'include',
    });

    console.log(`[API Proxy] Backend responded with status: ${response.status}`);
    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Login error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to authentication service' },
      { status: 502 }
    );
  }
}
