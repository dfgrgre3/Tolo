import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/live/fingerprints', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Admin live fingerprints GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device fingerprints' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/live/fingerprints', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin live fingerprints POST error:', error);
    return NextResponse.json(
      { error: 'Failed to manage device fingerprint' },
      { status: 500 },
    );
  }
}
