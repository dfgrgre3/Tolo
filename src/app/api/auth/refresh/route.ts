import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 502 }
    );
  }
}
