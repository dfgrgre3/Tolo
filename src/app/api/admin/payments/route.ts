import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/payments', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Admin payments GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 },
    );
  }
}
