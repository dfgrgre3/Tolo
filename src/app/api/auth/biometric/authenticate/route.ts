import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { webAuthnService } from '@/lib/security/webauthn';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions, setAuthCookies } from '@/app/api/auth/_helpers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();

      // Check if this is a verification request (has credential)
      if (body.credential && body.challenge) {
        return handleVerification(req, body);
      }

      // Otherwise assume it's an options request (has email)
      if (body.email) {
        return handleOptions(req, body);
      }

      return NextResponse.json(
        { error: 'ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©' },
        { status: 400 }
      );
    } catch (error) {
      logger.error('Biometric API error:', error);
      return NextResponse.json(
        { error: 'ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط®ط§ط¯ظ…' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      return handleVerification(req, body);
    } catch (error) {
      logger.error('Biometric verification error:', error);
      return NextResponse.json(
        { error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھط­ظ‚ظ‚' },
        { status: 500 }
      );
    }
  });
}

async function handleOptions(req: NextRequest, body: any) {
  const { email } = body;

  if (!email) {
    return NextResponse.json(
      { error: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط·ظ„ظˆط¨' },
      { status: 400 }
    );
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      biometricEnabled: true,
      biometricCredentials: true,
    },
  });

  if (!user || !user.biometricEnabled) {
    return NextResponse.json(
      { error: 'ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ط؛ظٹط± ظ…ظپط¹ظ„ط© ظ„ظ‡ط°ط§ ط§ظ„ط­ط³ط§ط¨' },
      { status: 404 }
    );
  }

  const credentials = user.biometricCredentials as any[] || [];

  if (credentials.length === 0) {
    return NextResponse.json(
      { error: 'ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ط§ط¹طھظ…ط§ط¯ ط¨ظٹظˆظ…طھط±ظٹط©' },
      { status: 404 }
    );
  }

  // Generate authentication options
  const options = webAuthnService.generateAuthenticationOptions(
    credentials.map((cred) => ({
      id: cred.id,
      userId: user.id,
      credentialId: cred.credentialId,
      publicKey: cred.publicKey,
      counter: cred.counter,
      deviceType: cred.deviceType || 'unknown',
      createdAt: new Date(cred.createdAt),
    }))
  );

  // Store challenge temporarily
  await prisma.biometricChallenge.create({
    data: {
      id: crypto.randomUUID(),
      challenge: options.challenge,
      type: 'authenticate',
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      used: false,
    },
  });

  // Log security event
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);
  await authService.logSecurityEvent(user.id, 'biometric_authentication_initiated', ip, {
    userAgent,
  }).catch(() => {
    // Non-blocking log failure
  });

  return NextResponse.json({
    options,
  });
}

async function handleVerification(req: NextRequest, body: any) {
  const { credential, challenge, email } = body;

  if (!credential || !challenge) {
    return NextResponse.json(
      { error: 'ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©' },
      { status: 400 }
    );
  }

  // If email is not provided, we might need to look it up via challenge or credential
  // But for now let's require email or try to infer it if possible (not easy without email)
  // The client usually sends email with verify request if it knows it.

  if (!email) {
    return NextResponse.json(
      { error: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط·ظ„ظˆط¨ ظ„ظ„طھط­ظ‚ظ‚' },
      { status: 400 }
    );
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      biometricEnabled: true,
      biometricCredentials: true,
    },
  });

  if (!user || !user.biometricEnabled) {
    return NextResponse.json(
      { error: 'ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ط؛ظٹط± ظ…ظپط¹ظ„ط©' },
      { status: 404 }
    );
  }

  // Verify challenge
  const storedChallenge = await prisma.biometricChallenge.findFirst({
    where: {
      challenge,
      userId: user.id,
      type: 'authenticate',
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!storedChallenge) {
    return NextResponse.json(
      { error: 'ط§ظ„طھط­ط¯ظٹ ط؛ظٹط± طµط§ظ„ط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©' },
      { status: 400 }
    );
  }

  // Find matching credential
  const credentials = user.biometricCredentials as any[] || [];
  const matchingCredential = credentials.find(
    (cred) => cred.credentialId === credential.id
  );

  if (!matchingCredential) {
    return NextResponse.json(
      { error: 'ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط؛ظٹط± طµط§ظ„ط­ط©' },
      { status: 400 }
    );
  }

  // Verify authentication response
  const verificationResult = await webAuthnService.verifyAuthentication(
    credential,
    challenge,
    {
      id: matchingCredential.id,
      userId: user.id,
      credentialId: matchingCredential.credentialId,
      publicKey: matchingCredential.publicKey,
      counter: matchingCredential.counter,
      deviceType: matchingCredential.deviceType || 'unknown',
      createdAt: new Date(matchingCredential.createdAt),
    }
  );

  if (!verificationResult.verified) {
    // Log failed authentication attempt
    const ip = authService.getClientIP(req);
    const userAgent = authService.getUserAgent(req);
    await authService.logSecurityEvent(user.id, 'biometric_authentication_failed', ip, {
      userAgent,
    }).catch(() => {
      // Non-blocking log failure
    });

    return NextResponse.json(
      { error: 'ظپط´ظ„ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط©' },
      { status: 400 }
    );
  }

  // Update counter
  if (verificationResult.newCounter !== undefined) {
    await prisma.biometricCredential.update({
      where: { id: matchingCredential.id },
      data: {
        counter: verificationResult.newCounter,
        // lastUsed is not in the schema currently, so we skip it or add it if needed. 
        // Schema showed: createdAt, updatedAt. No lastUsed.
        // If we want lastUsed, we need to add it to schema. For now, just update counter.
      },
    });
  }

  // Mark challenge as used
  await prisma.biometricChallenge.update({
    where: { id: storedChallenge.id },
    data: { used: true },
  });

  // Create session and tokens
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);

  await authService.updateLastLogin(user.id);

  // Create tokens first to get a refresh token
  const tempTokens = await authService.createTokens({
    id: user.id,
    email: user.email,
    name: user.name || undefined,
  });

  // Create session with the refresh token
  const session = await authService.createSession(user.id, userAgent, ip, tempTokens.refreshToken);

  // Create final tokens with session ID
  const { accessToken, refreshToken } = await authService.createTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    },
    session.id
  );

  // Update session with final refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken }
  });

  // Log security event
  await authService.logSecurityEvent(
    user.id,
    'biometric_login_success',
    ip,
    { userAgent, sessionId: session.id }
  );

  const response = NextResponse.json({
    message: 'طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ظ†ط¬ط§ط­',
    token: accessToken,
    refreshToken,
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  // Set cookies
  setAuthCookies(response, accessToken, refreshToken, true);

  return response;
}
