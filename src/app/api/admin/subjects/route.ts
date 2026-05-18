import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

const ENDPOINT = '/api/admin/subjects';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, ENDPOINT, { method: 'GET' });
  } catch (error) {
    console.error('Admin subjects GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch subjects data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin subjects POST error:', error);
    return NextResponse.json({ error: 'Failed to create subjects' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'PATCH', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin subjects PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update subjects' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'DELETE', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin subjects DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete subjects' }, { status: 500 });
  }
}
