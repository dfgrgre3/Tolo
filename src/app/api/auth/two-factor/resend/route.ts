import { NextRequest, NextResponse } from 'next/server';

// Store for temporary login attempts (in production, use Redis)
const loginAttempts = new Map<string, {
  userId: string;
  code: string;
  expires: Date;
}>();

export async function POST(request: NextRequest) {
  try {
    const { loginAttemptId } = await request.json();

    if (!loginAttemptId) {
      return NextResponse.json(
        { error: 'Login attempt ID is required' },
        { status: 400 }
      );
    }

    // Get the login attempt
    const loginAttempt = loginAttempts.get(loginAttemptId);
    
    if (!loginAttempt) {
      return NextResponse.json(
        { error: 'Invalid or expired login attempt' },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (new Date() > loginAttempt.expires) {
      loginAttempts.delete(loginAttemptId);
      return NextResponse.json(
        { error: 'Login attempt has expired' },
        { status: 400 }
      );
    }

    // Generate a new code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update the login attempt with the new code
    loginAttempts.set(loginAttemptId, {
      ...loginAttempt,
      code: newCode
    });

    // In a real application, you would send this code via email or SMS
    // For now, we'll just return it (this is not secure for production)
    console.log(`New 2FA Code: ${newCode}`);

    return NextResponse.json({
      message: 'New code sent successfully'
    });
  } catch (error) {
    console.error('Error resending 2FA code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}