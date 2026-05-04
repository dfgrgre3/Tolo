import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_URL,
  backendJsonResponse,
  upstreamAuthHeaders,
} from '@/app/api/auth/_utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const response = await fetch(
      `${BACKEND_URL}/api/admin/security/ip-whitelist${path}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...upstreamAuthHeaders(request),
        },
        cache: 'no-store',
      },
    );
    return backendJsonResponse(response);
  } catch (error) {
    console.error('Admin IP whitelist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IP whitelist' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const response = await fetch(
      `${BACKEND_URL}/api/admin/security/ip-whitelist${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...upstreamAuthHeaders(request),
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    return backendJsonResponse(response);
  } catch (error) {
    console.error('Admin IP whitelist POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add IP to whitelist' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    const response = await fetch(
      `${BACKEND_URL}/api/admin/security/ip-whitelist/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...upstreamAuthHeaders(request),
        },
        cache: 'no-store',
      },
    );
    return backendJsonResponse(response);
  } catch (error) {
    console.error('Admin IP whitelist DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove IP from whitelist' },
      { status: 500 },
    );
  }
}
