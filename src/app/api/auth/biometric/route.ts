
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createTokens,
  createSession,
  resetRateLimit
} from '@/lib/auth-enhanced';
import { getDeviceInfo, getLocationFromIP } from '@/lib/security-utils';
import {
  verifyAuthenticationResponse,
  generateAuthenticationOptions,
  generateRegistrationOptions
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import type {
  PublicKeyCredentialRequestOptionsJSON,
  PublicKeyCredentialCreationOptionsJSON,
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/typescript-types';
import { logger } from '@/lib/logger';
import { BiometricChallengeService } from '@/lib/auth-challenges-service';

// Helper function to validate environment variables
function validateEnvironment() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const rpId = new URL(baseUrl).hostname;

  return { baseUrl, rpId };
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    logger.info(`Biometric API request: ${action}`, { ip: request.headers.get('x-forwarded-for') });

    switch (action) {
      case 'register':
        return handleBiometricRegistration(request, data);
      case 'authenticate':
        return handleBiometricAuthentication(request, data);
      case 'options':
        return handleAuthenticationOptions(request, data);
      default:
        logger.warn(`Invalid biometric action: ${action}`);
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Biometric authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleBiometricRegistration(
  request: NextRequest,
  data: { userId: string; response: RegistrationResponseJSON }
) {
  const { userId, response } = data;

  if (!userId || !response) {
    return NextResponse.json(
      { error: 'User ID and response are required' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Get the registration challenge from database
  const challengeResult = await BiometricChallengeService.getChallenge(`register-${userId}`);

  if (!challengeResult) {
    return NextResponse.json(
      { error: 'No registration challenge found' },
      { status: 400 }
    );
  }

  // Verify the challenge is still valid
  if (new Date() > challengeResult.expiresAt || challengeResult.used) {
    await BiometricChallengeService.deleteChallenge(`register-${userId}`);
    return NextResponse.json(
      { error: 'Challenge expired or already used' },
      { status: 400 }
    );
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeResult.challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      expectedRPID: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname,
    });
  } catch (error) {
    console.error('Registration verification failed:', error);
    return NextResponse.json(
      { error: 'Registration verification failed' },
      { status: 400 }
    );
  }

  // Mark challenge as used
  await BiometricChallengeService.deleteChallenge(`register-${userId}`);

  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    return NextResponse.json(
      { error: 'Registration could not be verified' },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      biometricEnabled: true,
      biometricCredentials: {
        push: {
          credentialId: isoUint8Array.toHex(registrationInfo.credentialID),
          publicKey: isoUint8Array.toHex(registrationInfo.credentialPublicKey),
          counter: registrationInfo.counter,
          backedUp: registrationInfo.credentialBackedUp,
          deviceType: registrationInfo.credentialDeviceType,
          createdAt: new Date()
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Biometric registration successful'
  });
}

async function handleBiometricAuthentication(
  request: NextRequest,
  data: { response: AuthenticationResponseJSON }
) {
  const { response } = data;

  if (!response) {
    return NextResponse.json(
      { error: 'Authentication response is required' },
      { status: 400 }
    );
  }

  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const clientId = `${ip}-${userAgent}`;

  // Get the authentication challenge from database
  const challengeResult = await BiometricChallengeService.getChallenge(`auth-${response.id}`);

  if (!challengeResult) {
    return NextResponse.json(
      { error: 'No authentication challenge found' },
      { status: 400 }
    );
  }

  // Verify the challenge is still valid
  if (new Date() > challengeResult.expiresAt || challengeResult.used) {
    await BiometricChallengeService.deleteChallenge(`auth-${response.id}`);
    return NextResponse.json(
      { error: 'Challenge expired or already used' },
      { status: 400 }
    );
  }

  // Find user by credential ID
  const user = await prisma.user.findFirst({
    where: {
      biometricCredentials: {
        some: {
          credentialId: isoUint8Array.toHex(isoUint8Array.fromHex(response.id))
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Biometric credential not found' },
      { status: 404 }
    );
  }

  if (!user.biometricEnabled) {
    return NextResponse.json(
      { error: 'Biometric authentication is not enabled for this account' },
      { status: 401 }
    );
  }

  // Find the matching credential
  const credential = user.biometricCredentials.find(
    cred => cred.credentialId === isoUint8Array.toHex(isoUint8Array.fromHex(response.id))
  );

  if (!credential) {
    return NextResponse.json(
      { error: 'Credential not recognized' },
      { status: 400 }
    );
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeResult.challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      expectedRPID: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname,
      authenticator: {
        credentialID: isoUint8Array.fromHex(credential.credentialId),
        credentialPublicKey: isoUint8Array.fromHex(credential.publicKey),
        counter: credential.counter,
        transports: ['usb', 'ble', 'nfc', 'internal']
      },
    });
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 400 }
    );
  }

  // Mark challenge as used
  await BiometricChallengeService.deleteChallenge(`auth-${response.id}`);

  const { verified, authenticationInfo } = verification;
  if (!verified || !authenticationInfo) {
    return NextResponse.json(
      { error: 'Authentication could not be verified' },
      { status: 400 }
    );
  }

  // Update credential counter
  await prisma.user.update({
    where: {
      id: user.id,
      biometricCredentials: {
        some: {
          credentialId: credential.credentialId
        }
      }
    },
    data: {
      biometricCredentials: {
        updateMany: {
          where: { credentialId: credential.credentialId },
          data: { counter: authenticationInfo.newCounter }
        }
      }
    }
  });

  // Create session
  const session = await createSession(user.id, userAgent, ip);

  // Reset rate limiting on successful login
  resetRateLimit(clientId);

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // Create authentication tokens
  const { accessToken, refreshToken } = await createTokens(
    user.id,
    user.email,
    user.name || undefined,
    user.role || undefined,
    session.id
  );

  // Get device info and location for security logging
  const deviceInfo = await getDeviceInfo(userAgent);
  const location = await getLocationFromIP(ip);

  // Log security event
  await prisma.securityLog.create({
    data: {
      userId: user.id,
      eventType: 'BIOMETRIC_LOGIN_SUCCESS',
      ip,
      userAgent,
      deviceInfo: JSON.stringify(deviceInfo),
      location,
      metadata: JSON.stringify({ sessionId: session.id, credentialId: credential.credentialId })
    }
  });

  // Return user data without password
  const { passwordHash, refreshToken: _, biometricCredentials, ...userData } = user;

  const responseObj = NextResponse.json({
    message: 'Biometric authentication successful',
    user: userData,
    token: accessToken,
    refreshToken
  });

  // Set refresh token in httpOnly cookie
  responseObj.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });

  return responseObj;
}

async function handleAuthenticationOptions(
  request: NextRequest,
  data: { userId?: string; action: 'register' | 'login' }
) {
  const { userId, action } = data;

  if (!action || !['register', 'login'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "register" or "login"' },
      { status: 400 }
    );
  }

  if (action === 'register' && !userId) {
    return NextResponse.json(
      { error: 'User ID is required for registration' },
      { status: 400 }
    );
  }

  let options: PublicKeyCredentialCreationOptionsJSON | PublicKeyCredentialRequestOptionsJSON;
  let challengeKey: string;

  if (action === 'register') {
    // Generate registration challenge
    const user = await prisma.user.findUnique({
      where: { id: userId! }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    options = generateRegistrationOptions({
      rpName: 'Thanawy Educational Platform',
      rpID: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname,
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    challengeKey = `register-${userId}`;
  } else {
    // Generate authentication challenge
    // For now, we'll allow any registered user, but in production you might want to specify which user
    options = generateAuthenticationOptions({
      rpID: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname,
      userVerification: 'preferred',
    });

    challengeKey = `auth-${Date.now()}`;
  }

  // Store challenge in database
  await BiometricChallengeService.createChallenge(
    (options as any).challenge,
    action,
    action === 'register' ? userId : undefined,
    5 // 5 minutes
  );

  return NextResponse.json({
    success: true,
    options
  });
}
