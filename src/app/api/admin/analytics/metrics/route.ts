import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/analytics/metrics', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Admin analytics metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity metrics' },
      { status: 500 },
    );
  }
}
