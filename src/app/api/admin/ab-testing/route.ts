import { NextRequest, NextResponse } from 'next/server';
import { forwardToGoApi } from '@/app/api/admin/_proxy';

export async function GET(request: NextRequest) {
  try {
    return await forwardToGoApi(request, '/api/admin/ab-testing', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Admin ab-testing GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch A/B testing data' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/ab-testing', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin ab-testing POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/ab-testing', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin ab-testing PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update A/B test' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    return await forwardToGoApi(request, '/api/admin/ab-testing', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Admin ab-testing DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete A/B test' },
      { status: 500 },
    );
  }
}
