import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '@/app/api/auth/_utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '6';
    const force = searchParams.get('force') || 'false';

    // Get auth token from cookies
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(`${BACKEND_URL}/api/ai/recommendations?limit=${limit}&force=${force}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      credentials: 'include'
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[AI Recommendations] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch AI recommendations',
        recommendations: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(`${BACKEND_URL}/api/ai/recommendations/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    return backendJsonResponse(response);
  } catch (error) {
    console.error('[AI Track Recommendation] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to track recommendation interaction'
      },
      { status: 500 }
    );
  }
}
