import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';

const extractToken = async (request: NextRequest): Promise<string | null> => {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieStore = await cookies();
  return (
    cookieStore.get('access_token')?.value ??
    cookieStore.get('auth_token')?.value ??
    null
  );
};

export async function GET(request: NextRequest) {
  try {
    const token = await extractToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'يتطلب هذا الطلب تسجيل الدخول.' },
        { status: 401 },
      );
    }

    const verification = await authService.verifyTokenFromInput(token, true);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: verification.error || 'انتهت صلاحية الجلسة الحالية.' },
        { status: 401 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: verification.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'تعذر العثور على حساب المستخدم.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      user: dbUser,
      sessionId: verification.sessionId,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'حدث خلل أثناء التحقق من الجلسة.' },
      { status: 500 },
    );
  }
}
