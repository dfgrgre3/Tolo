import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, upstreamAuthHeaders } from '@/app/api/auth/_utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const headers = upstreamAuthHeaders(request);
    const resolvedParams = await params;
    const path = resolvedParams.path ? resolvedParams.path.join('/') : '';
    const { search } = new URL(request.url);
    const targetUrl = `${BACKEND_URL}/api/exams${path ? '/' + path : ''}${search}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || `Failed to fetch from ${path}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Proxy] Exams error:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to exams service' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const headers = upstreamAuthHeaders(request);
    const resolvedParams = await params;
    const path = resolvedParams.path ? resolvedParams.path.join('/') : '';
    const { search } = new URL(request.url);
    const targetUrl = `${BACKEND_URL}/api/exams${path ? '/' + path : ''}${search}`;
    const body = await request.text();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || `Failed to post to ${path}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Proxy] Exams POST error:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to exams service' },
      { status: 502 }
    );
  }
}
