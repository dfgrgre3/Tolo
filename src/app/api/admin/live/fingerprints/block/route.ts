import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/live/fingerprints/block', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin live fingerprints block error:', error);
    return NextResponse.json(
      { error: 'Failed to block device' },
      { status: 500 },
    );
  }
}
