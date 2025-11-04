import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

const registerSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
    .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'),
  name: z.string().min(1, 'الاسم مطلوب').max(100, 'الاسم طويل جداً').optional(),
});

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'تعذر معالجة البيانات المدخلة.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await authService.findUserByEmail(normalizedEmail);

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'البريد الإلكتروني مستخدم بالفعل.',
          code: 'USER_EXISTS',
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    // Log security event
    await authService.logSecurityEvent(newUser.id, 'register_success', ip, {
      userAgent,
    });

    // In production, send email with verification link
    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;

    // Return user data without password
    const { passwordHash: _removed, ...userData } = newUser;

    return NextResponse.json(
      {
        message: 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني.',
        user: userData,
        verificationLink, // TODO: Remove in production
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    await authService.logSecurityEvent(null, 'register_error', ip, {
      userAgent,
    });

    return NextResponse.json(
      {
        error: 'حدث خطأ غير متوقع أثناء التسجيل. حاول مرة أخرى لاحقاً.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}