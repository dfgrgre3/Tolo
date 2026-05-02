import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '@/app/api/auth/_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Transform frontend request format to backend expected format
    const backendPayload = {
      message: body.message,
      userIds: body.userIds || [],
      title: body.title,
      type: body.type,
      channels: body.channels,
      actionUrl: body.actionUrl,
    };

    const response = await fetch(`${BACKEND_URL}/api/admin/users/bulk-send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(backendPayload),
      credentials: 'include',
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Bulk send message error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to broadcast service' },
      { status: 502 }
    );
  }
}
