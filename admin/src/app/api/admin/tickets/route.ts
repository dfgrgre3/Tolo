import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/tickets', { method: 'GET' });
  } catch (error) {
    console.error('Admin tickets GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin tickets POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/tickets', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin tickets PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 },
    );
  }
}
