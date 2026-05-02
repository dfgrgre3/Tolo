import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '../_utils';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Me error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to authentication service' },
      { status: 502 }
    );
  }
}
