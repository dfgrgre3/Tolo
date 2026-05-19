import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/live/roles', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Admin live roles GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/live/roles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin live roles POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/live/roles', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin live roles PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/live/roles', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin live roles DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 },
    );
  }
}
