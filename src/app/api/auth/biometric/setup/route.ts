import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-service';
import { generateSecureToken } from '@/lib/security-utils';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ‡ظٹط¯ط± ط§ظ„طھظˆط«ظٹظ‚ ظˆطµط­طھظ‡
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization header missing or invalid' },
          { status: 401 }
        );
      }

      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // ط¬ظ„ط¨ ط§ظ„ظ…ط³طھط®ط¯ظ…
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // طھظˆظ„ظٹط¯ ط¨ظٹط§ظ†ط§طھ ط¨ظٹظˆظ…طھط±ظٹط© ظˆظ‡ظ…ظٹط© (ظپظٹ ط§ظ„طھط·ط¨ظٹظ‚ ط§ظ„ط­ظ‚ظٹظ‚ظٹ ظٹطھظ… طھظˆظ„ظٹط¯ ط¨ظٹط§ظ†ط§طھ WebAuthn)
      const credentialId = generateSecureToken(32);
      const publicKey = generateSecureToken(64);
      const deviceName = req.headers.get('user-agent') || 'Unknown device';

    // ط­ظپط¸ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط©
    await prisma.biometricCredential.create({
      data: {
        userId: user.id,
        credentialId,
        publicKey,
        deviceType: deviceName,
      }
    });

    // طھظپط¹ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ظ„ظ„ظ…ط³طھط®ط¯ظ…
    await prisma.user.update({
      where: { id: user.id },
      data: { biometricEnabled: true }
    });

      return NextResponse.json({
        message: 'طھظ… ط¥ط¹ط¯ط§ط¯ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ط¨ظ†ط¬ط§ط­',
        credentialId,
        challenge: generateSecureToken(32)
      });
    } catch (error) {
      logger.error('Biometric setup error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ‡ظٹط¯ط± ط§ظ„طھظˆط«ظٹظ‚ ظˆطµط­طھظ‡
      const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded?.userId) {
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    // ط­ط°ظپ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ظ„ظ„ظ…ط³طھط®ط¯ظ…
    await prisma.biometricCredential.deleteMany({
      where: { userId: decoded.userId }
    });

    // طھط¹ط·ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ظ„ظ„ظ…ط³طھط®ط¯ظ…
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { biometricEnabled: false }
    });

    return NextResponse.json({
      message: 'طھظ… ط¥ط²ط§ظ„ط© ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط¨ظٹظˆظ…طھط±ظٹط© ط¨ظ†ط¬ط§ط­'
    });
  } catch (error) {
    logger.error('Biometric removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    }
  });
}
