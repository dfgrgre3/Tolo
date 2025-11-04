import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Await params in Next.js 16
    const { sessionId } = await params;
    
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'الجلسة غير موجودة' },
        { status: 404 }
      );
    }

    // Delete session
    await prisma.session.delete({
      where: { id: sessionId },
    });

    // Log security event
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await authService.logSecurityEvent(
      userId,
      'session_revoked',
      ip,
      {
        userAgent,
        revokedSessionId: sessionId,
        revokedDevice: session.deviceInfo,
      }
    );

    return NextResponse.json({
      message: 'تم إلغاء الجلسة بنجاح',
    });

  } catch (error) {
    console.error('Failed to revoke session:', error);
    return NextResponse.json(
      { error: 'فشل إلغاء الجلسة' },
      { status: 500 }
    );
  }
}

