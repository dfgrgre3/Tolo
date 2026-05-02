import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to logout service' },
      { status: 502 }
    );
  }
}
