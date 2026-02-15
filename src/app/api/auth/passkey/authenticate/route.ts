import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { getDeviceInfo, getLocationFromIP } from '@/lib/security-utils';
import crypto from 'crypto';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';
import { BiometricChallengeService } from '@/lib/services/auth-challenges-service';

async function handler(req: NextRequest) {
  const responseBody: AuthenticationResponseJSON = await req.json();

  if (!responseBody) {
    return NextResponse.json({ error: 'Authentication response is required' }, { status: 400 });
  }

  // The credential ID is sent in base64url format from the client.
  const credentialId = responseBody.id;

  const credential = await prisma.biometricCredential.findUnique({
    where: { credentialId: credentialId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          biometricEnabled: true
        }
      }
    },
  });

  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  const user = credential.user;

  if (!user.biometricEnabled) {
    return NextResponse.json({ error: 'Biometric authentication is not enabled for this account' }, { status: 401 });
  }

  // FIX: Extract challenge directly from clientDataJSON to verify we have a matching record
  // instead of blindly picking the first available one.
  let clientChallenge = '';
  try {
    const clientData = JSON.parse(Buffer.from(responseBody.response.clientDataJSON, 'base64').toString('utf8'));
    clientChallenge = clientData.challenge;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid client data' }, { status: 400 });
  }

  // Find the SPECIFIC challenge in DB
  const challengeRecord = await prisma.biometricChallenge.findFirst({
    where: {
      challenge: clientChallenge,
      type: 'authenticate',
      used: false,
      userId: user.id, // Security hardening: Ensure challenge belongs to user
      expiresAt: { gt: new Date() }
    }
  });

  if (!challengeRecord) {
    return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
  }

  const expectedChallenge = challengeRecord.challenge;


  let verification;
  try {
    const rpID = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname;

    verification = await verifyAuthenticationResponse({
      response: responseBody,
      expectedChallenge: expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: isoUint8Array.fromHex(credential.publicKey),
        counter: credential.counter,
      },
      requireUserVerification: true,
    });
  } catch (error) {
    logger.error('Passkey authentication verification failed:', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Verification failed: ${errorMessage}` }, { status: 400 });
  }

  const { verified, authenticationInfo } = verification;

  if (!verified) {
    return NextResponse.json({ error: 'Could not verify authentication' }, { status: 400 });
  }

  // Mark the challenge as used
  await BiometricChallengeService.deleteChallenge(challengeRecord.id);

  // Update the credential counter
  await prisma.biometricCredential.update({
    where: { id: credential.id },
    data: { counter: authenticationInfo.newCounter },
  });

  // Create tokens first to get a refresh token
  const tempTokens = await authService.createTokens({
    userId: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role || 'user',
  });

  // Create session
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const session = await authService.createSession(user.id, tempTokens.refreshToken, userAgent, ip);

  // Create tokens
  const tokensResult = await authService.createTokens(
    {
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || 'user',
    },
    session.id
  );

  // Update session with final refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: tokensResult.refreshToken }
  });

  // Log security event
  const deviceInfo = await getDeviceInfo(userAgent);
  const location = await getLocationFromIP(ip);
  await prisma.securityLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      eventType: 'PASSKEY_LOGIN_SUCCESS',
      ip,
      userAgent,
      deviceInfo: JSON.stringify(deviceInfo),
      location,
      metadata: JSON.stringify({ sessionId: session.id, credentialId: credential.credentialId })
    }
  });

  const userData = user;

  const response = NextResponse.json({
    message: 'Authentication successful',
    user: userData,
    token: tokensResult.accessToken,
  });

  response.cookies.set('refresh_token', tokensResult.refreshToken, {
    ...getSecureCookieOptions({ maxAge: 30 * 24 * 60 * 60 }), // 30 days
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    return await opsWrapper(request, handler);
  } catch (error) {
    logger.error('Error during passkey authentication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
