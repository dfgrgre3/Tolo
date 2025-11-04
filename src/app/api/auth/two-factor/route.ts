import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { SignJWT, jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { authService } from '@/lib/auth-service';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key');

// Generate a new 2FA verification code
export async function GET(request: NextRequest) {
  try {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate a unique ID for this login attempt
    const loginAttemptId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Store the attempt in database (expires in 10 minutes)
    await TwoFactorChallengeService.createChallenge('', code, 10);

    return NextResponse.json({
      loginAttemptId
      // Removed code from response for security - it should only be sent via email/SMS
    });
  } catch (error) {
    console.error('Error generating 2FA code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Combined POST handler for both 2FA login verification and management
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginAttemptId, code, action, userId, backupCode } = body;

    // If loginAttemptId is provided, this is a login verification request
    if (loginAttemptId) {
      // Verify 2FA code for login
      if (!code) {
        return NextResponse.json(
          { error: 'Code is required' },
          { status: 400 }
        );
      }

      // Verify and consume the challenge from database
      const challengeResult = await TwoFactorChallengeService.verifyAndConsumeChallenge(loginAttemptId, code);

      if (!challengeResult.valid) {
        return NextResponse.json(
          { error: 'Invalid or expired login attempt' },
          { status: 400 }
        );
      }

      if (!challengeResult.userId) {
        return NextResponse.json(
          { error: 'Invalid or expired login attempt' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: challengeResult.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          twoFactorEnabled: true,
          lastLogin: true,
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const ip = authService.getClientIP(request);
      const userAgent = authService.getUserAgent(request);
      const clientId = `${ip}-${userAgent}`;
      const rememberDevice = Boolean(body.trustDevice);
      const loginTimestamp = new Date();

      await authService.resetRateLimit(clientId);

      const session = await authService.createSession(user.id, userAgent, ip);
      const { accessToken, refreshToken } = await authService.createTokens(
        {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role || undefined,
        },
        session.id,
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: loginTimestamp,
        },
      }).catch(() => {
        // Non-critical persistence error
      });

      await authService.logSecurityEvent(user.id, 'two_factor_verified', ip, {
        userAgent,
        sessionId: session.id,
      });

      const response = NextResponse.json({
        message: 'تم التحقق من الرمز بنجاح.',
        user: {
          ...user,
          role: user.role || 'user',
          lastLogin: loginTimestamp,
        },
        token: accessToken,
        refreshToken,
        sessionId: session.id,
      });

      response.cookies.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60,
        path: '/',
      });

      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: rememberDevice ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // Otherwise, handle 2FA management actions
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required for 2FA management' },
        { status: 400 }
      );
    }

    // Get user ID from token if not provided
    let targetUserId = userId;
    if (!targetUserId) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const { payload } = await jwtVerify(token, JWT_SECRET);

      targetUserId = payload.userId as string;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'setup':
        return await handleSetup2FA(user);
      case 'verify':
        return await handleVerify2FA(user, code);
      case 'disable':
        return await handleDisable2FA(user, code);
      case 'backup-code':
        return await handleBackupCode(user, backupCode);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Two-factor authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle 2FA setup
async function handleSetup2FA(user: any) {
  try {
    // In a real implementation, you would generate a secret key and QR code
    // For this example, we'll just generate a placeholder secret

    // Generate a secret key (in a real implementation, use a library like speakeasy)
    const secret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 encoded secret

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store the secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        twoFactorSecret: secret,
        backupCodes: JSON.stringify(backupCodes)
      }
    });

    // In a real implementation, you would also generate a QR code
    // For this example, we'll just return the secret and backup codes

    return NextResponse.json({
      secret,
      backupCodes,
      message: '2FA setup initiated. Please verify with your authenticator app.'
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

// Handle 2FA verification
async function handleVerify2FA(user: any, code: string) {
  try {
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA not set up for this user' },
        { status: 400 }
      );
    }

    // Verify the code (in a real implementation, use a library like speakeasy)
    // For this example, we'll just check if the code is '123456'
    const isValid = code === '123456'; // Placeholder

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });

    // Log security event
    await authService.logSecurityEvent(user.id, '2fa_enabled', 'unknown', {
      userAgent: 'unknown',
    });

    return NextResponse.json({
      message: '2FA has been enabled successfully'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

// Handle 2FA disabling
async function handleDisable2FA(user: any, code: string) {
  try {
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    // Verify the code (in a real implementation, use a library like speakeasy)
    // For this example, we'll just check if the code is '123456'
    const isValid = code === '123456'; // Placeholder

    if (!isValid) {
      // Check if it's a backup code
      const backupCodes = user.backupCodes ? JSON.parse(user.backupCodes) : [];
      const backupCodeIndex = backupCodes.indexOf(code);

      if (backupCodeIndex === -1) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Remove the used backup code
      backupCodes.splice(backupCodeIndex, 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { backupCodes: JSON.stringify(backupCodes) }
      });
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null
      }
    });

    // Log security event
    await authService.logSecurityEvent(user.id, '2fa_disabled', 'unknown', {
      userAgent: 'unknown',
    });

    return NextResponse.json({
      message: '2FA has been disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

// Handle backup code verification
async function handleBackupCode(user: any, backupCode: string) {
  try {
    if (!backupCode) {
      return NextResponse.json(
        { error: 'Backup code is required' },
        { status: 400 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    const backupCodes = user.backupCodes ? JSON.parse(user.backupCodes) : [];
    const backupCodeIndex = backupCodes.indexOf(backupCode);

    if (backupCodeIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 }
      );
    }

    // Remove the used backup code
    backupCodes.splice(backupCodeIndex, 1);
    await prisma.user.update({
      where: { id: user.id },
      data: { backupCodes: JSON.stringify(backupCodes) }
    });

    // Log security event
    await authService.logSecurityEvent(user.id, '2fa_backup_code_used', 'unknown', {
      userAgent: 'unknown',
    });

    // Generate a new token for the user
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return NextResponse.json({
      message: 'Backup code verified successfully',
      token,
      remainingBackupCodes: backupCodes.length
    });
  } catch (error) {
    console.error('Backup code verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify backup code' },
      { status: 500 }
    );
  }
}

// Generate backup codes
function generateBackupCodes(count = 10): string[] {
  const codes = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    let code = '';
    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-';
      const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      code += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    codes.push(code);
  }

  return codes;
}

