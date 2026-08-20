import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Log CSP violations for security monitoring
    console.error('CSP Violation:', JSON.stringify(report, null, 2));
    
    // In production, you would send this to your monitoring service
    // Example: await sendToSentry(report);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}