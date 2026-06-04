import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // We can log these metrics to standard output or simply return a successful status
    console.log('[Web Vitals Metric]:', data);

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
