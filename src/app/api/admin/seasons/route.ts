import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

const ENDPOINT = '/api/admin/seasons';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, ENDPOINT, { method: 'GET' });
  } catch (error) {
    console.error('Admin seasons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch seasons data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin seasons POST error:', error);
    return NextResponse.json({ error: 'Failed to create seasons' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'PATCH', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin seasons PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update seasons' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'DELETE', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin seasons DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete seasons' }, { status: 500 });
  }
}
