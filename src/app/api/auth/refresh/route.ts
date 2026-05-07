import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse, upstreamAuthHeaders } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: upstreamAuthHeaders(request),
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
