import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/teachers', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Admin teachers GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin teachers POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create teacher' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/teachers', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin teachers PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/teachers', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin teachers DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 },
    );
  }
}
