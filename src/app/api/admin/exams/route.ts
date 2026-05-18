import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

const ENDPOINT = '/api/admin/exams';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, ENDPOINT, { method: 'GET' });
  } catch (error) {
    console.error('Admin exams GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch exams data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin exams POST error:', error);
    return NextResponse.json({ error: 'Failed to create exams' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'PATCH', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin exams PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update exams' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, ENDPOINT, { method: 'DELETE', body: JSON.stringify(body) });
  } catch (error) {
    console.error('Admin exams DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete exams' }, { status: 500 });
  }
}
