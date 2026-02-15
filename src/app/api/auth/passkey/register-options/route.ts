import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { authService } from '@/lib/services/auth-service';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { BiometricChallengeService } from '@/lib/services/auth-challenges-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

async function handler(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Verify authentication
  const verification = await authService.verifyTokenFromRequest(req);
  if (!verification.isValid || !verification.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (verification.user.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      biometricCredentials: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const rpName = 'Thanawy Educational Platform';
  const rpID = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').hostname;

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    // Don't allow re-registration of the same authenticator
    excludeCredentials: user.biometricCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
      // Optional: Specify transports if you have them stored
      // transports: cred.transports,
    })),
  });

  // Store the challenge in the database
  await BiometricChallengeService.createChallenge(
    options.challenge,
    'register',
    userId,
    5 // 5 minutes validity
  );

  // The client-side PasskeyManager expects the user ID in the options
  const optionsWithUserId = {
    ...options,
    userId: user.id,
  };

  return NextResponse.json(optionsWithUserId);
}

export async function POST(request: NextRequest) {
  try {
    // The opsWrapper should handle session validation and other middleware logic
    return await opsWrapper(request, handler);
  } catch (error) {
    logger.error('Error generating passkey registration options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
