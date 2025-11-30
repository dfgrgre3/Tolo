import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { BiometricChallengeService } from '@/lib/auth-challenges-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

async function handler(req: NextRequest) {
  const { userId, deviceName, transports = [], ...registrationResponse } = await req.json();

  if (!userId || !registrationResponse) {
    return NextResponse.json({ error: 'User ID and registration response are required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Find the challenge that was generated for this registration
  // The BiometricChallengeService doesn't store the challenge with a specific key,
  // so we have to find it by userId and type. This is not ideal, but we'll follow the existing pattern.
  const challenges = await prisma.biometricChallenge.findMany({
    where: {
      userId: userId,
      type: 'register',
      used: false,
      expiresAt: { gt: new Date() }
    }
  });

  const expectedChallenge = challenges.length > 0 ? challenges[0].challenge : undefined;

  if (!expectedChallenge) {
    return NextResponse.json({ error: 'No valid registration challenge found for this user.' }, { status: 400 });
  }

  let verification;
  try {
    const rpID = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname;

    verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    logger.error('Passkey registration verification failed:', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Verification failed: ${errorMessage}` }, { status: 400 });
  }

  const { verified, registrationInfo } = verification;

  if (!verified || !registrationInfo) {
    return NextResponse.json({ error: 'Could not verify registration' }, { status: 400 });
  }

  // Mark the challenge as used
  await BiometricChallengeService.deleteChallenge(challenges[0].id);

  const { credential } = registrationInfo;
  const { publicKey: credentialPublicKey, id: credentialID, counter } = credential;

  // Store the new credential in the `BiometricCredential` table
  const newCredential = await prisma.biometricCredential.create({
    data: {
      user: {
        connect: {
          id: user.id
        }
      },
      credentialId: credentialID,
      publicKey: isoUint8Array.toHex(credentialPublicKey),
      counter: counter,
      // The PasskeyManager doesn't seem to send deviceType, so we'll leave it nullable
      // deviceType: registrationResponse.transports,
      deviceName: deviceName,
      transports: transports
    }
  });

  // Update the user to reflect that they have a biometric credential enabled
  await prisma.user.update({
    where: { id: user.id },
    data: {
      biometricEnabled: true,
    },
  });

  return NextResponse.json({ verified: true, credential: newCredential });
}

export async function POST(request: NextRequest) {
  try {
    return await opsWrapper(request, handler);
  } catch (error) {
    logger.error('Error during passkey registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
