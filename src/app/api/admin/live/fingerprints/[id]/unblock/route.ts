import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    return await forwardToGoApi(request, `/api/admin/live/fingerprints/${id}/unblock`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Admin live fingerprints unblock error:', error);
    return NextResponse.json(
      { error: 'Failed to unblock device' },
      { status: 500 },
    );
  }
}
