import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '../_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: body,
      credentials: 'include',
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Register error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to registration service' },
      { status: 502 }
    );
  }
}
