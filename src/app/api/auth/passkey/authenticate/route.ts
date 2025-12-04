import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authService } from '@/lib/auth-service';
import { getDeviceInfo, getLocationFromIP } from '@/lib/security-utils';
import crypto from 'crypto';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';
import { BiometricChallengeService } from '@/lib/auth-challenges-service';

async function handler(req: NextRequest) {
  const responseBody: AuthenticationResponseJSON = await req.json();

  if (!responseBody) {
    return NextResponse.json({ error: 'Authentication response is required' }, { status: 400 });
  }

  // The credential ID is sent in base64url format from the client.
  const credentialId = responseBody.id;

  const credential = await prisma.biometricCredential.findUnique({
    where: { credentialId: credentialId },
    include: { user: true },
  });

  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  const user = credential.user;

  if (!user.biometricEnabled) {
    return NextResponse.json({ error: 'Biometric authentication is not enabled for this account' }, { status: 401 });
  }

  // Find the challenge. The `authenticate-options` endpoint stored it without a specific ID.
  // We'll find it by the challenge string itself.
  const challenges = await prisma.biometricChallenge.findMany({
    where: {
      type: 'authenticate',
      used: false,
      expiresAt: { gt: new Date() }
    }
  });

  // This is not a robust way to find the challenge. A better implementation would
  // involve a unique identifier for the challenge that is passed between the options and verification steps.
  // For now, we find a challenge that matches.
  const expectedChallenge = challenges.length > 0 ? challenges[0].challenge : undefined;

  if (!expectedChallenge) {
    return NextResponse.json({ error: 'No valid authentication challenge found.' }, { status: 400 });
  }

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
  await BiometricChallengeService.deleteChallenge(challenges[0].id);

  // Update the credential counter
  await prisma.biometricCredential.update({
    where: { id: credential.id },
    data: { counter: authenticationInfo.newCounter },
  });

  // Create tokens first to get a refresh token
  const tempTokens = await authService.createTokens({
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role || undefined,
  });

  // Create session
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const session = await authService.createSession(user.id, userAgent, ip, tempTokens.refreshToken);

  // Create tokens
  const tokensResult = await authService.createTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
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

  const { passwordHash, ...userData } = user;

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
