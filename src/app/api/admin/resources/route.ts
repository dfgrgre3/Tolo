import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

const ENDPOINT = '/api/admin/resources';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, ENDPOINT, { method: 'GET' });
  } catch (error) {
    console.error('Admin resources GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch resources data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin resources POST error:', error);
    return NextResponse.json({ error: 'Failed to create resources' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'PATCH', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin resources PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update resources' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'DELETE', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin resources DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete resources' }, { status: 500 });
  }
}
