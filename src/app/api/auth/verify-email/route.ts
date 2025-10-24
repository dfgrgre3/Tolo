import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const verificationFailure = (message: string, status = 400) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return verificationFailure('رمز التحقق مفقود.', 400);
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return verificationFailure('رمز التحقق غير صالح أو تم استخدامه مسبقاً.', 404);
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'تم تفعيل البريد مسبقاً، يمكنك متابعة استخدام الحساب.',
      });
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires.getTime() < Date.now()
    ) {
      return verificationFailure(
        'انتهت صلاحية رابط التفعيل. يرجى طلب رابط جديد من صفحة الحساب.',
        410,
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل البريد الإلكتروني بنجاح.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return verificationFailure('حدث خطأ غير متوقع أثناء التفعيل.', 500);
  }
}
