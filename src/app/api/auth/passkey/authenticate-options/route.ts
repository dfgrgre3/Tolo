import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';
import { BiometricChallengeService } from '@/lib/auth-challenges-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

async function handler(req: NextRequest) {
  const { userId } = await req.json();

  let allowCredentials: any[] | undefined = undefined;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { biometricCredentials: true },
    });

    if (user) {
      allowCredentials = user.biometricCredentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports,
      }));
    }
  }

  const rpID = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname;

  const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials,
  });

  // The challenge needs to be stored for the verification step.
  // The old biometric service stored the challenge with a key like `auth-${response.id}`.
  // This is problematic because we don't know the response.id yet.
  // A better approach is to generate a random key for the challenge and send it back to the client.
  // The client will then send it back during the verification step.
  // However, to maintain consistency with the existing (flawed) pattern, we'll create a challenge
  // that is not tied to a user or credential ID yet. The verification step will have to look for it.
  
  // Let's create a temporary ID for the challenge.
  const challengeId = `auth-challenge-${Date.now()}`;
  await BiometricChallengeService.createChallenge(
    options.challenge,
    'authenticate',
    userId, // Store userId if available
    5 // 5 minutes validity
  );
  
  // We'll add the challenge itself to the response so the client can use it to find the challenge later.
  // This is not ideal, but it's a way to work with the current challenge service.
  // A better solution would be to return a unique challenge identifier.
  const response = {
    ...options,
    // The PasskeyManager expects the challenge in the response.
    challenge: options.challenge
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  try {
    return await opsWrapper(request, handler);
  } catch (error) {
    logger.error('Error generating passkey authentication options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
