import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    return await forwardToGoApi(request, `/api/admin/backups${path}`);
  } catch (error) {
    console.error('Admin backups GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backups' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/backups', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin backups POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    return await forwardToGoApi(request, `/api/admin/backups/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Admin backups DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 },
    );
  }
}
