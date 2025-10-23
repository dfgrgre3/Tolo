import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { prisma } from '@/lib/prisma';

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل'),
  rememberMe: z.boolean().optional(),
});

const TWO_FACTOR_TTL_MINUTES = 10;

const buildClientId = (ip: string, userAgent: string) =>
  `${ip || 'unknown'}-${userAgent || 'unknown'}`;

const generateTwoFactorCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);
  const clientId = buildClientId(ip, userAgent);

  try {
    if (await authService.isRateLimited(clientId)) {
      await authService.logSecurityEvent(null, 'login_rate_limited', ip, {
        userAgent,
      });

      return NextResponse.json(
        {
          error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب عدد المحاولات المرتفع. حاول مرة أخرى خلال بضع دقائق.',
          code: 'RATE_LIMITED',
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            'تعذر معالجة البيانات المدخلة. تأكد من صحة البريد الإلكتروني وكلمة المرور.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password, rememberMe } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await authService.findUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      await authService.recordFailedAttempt(clientId);
      await authService.logSecurityEvent(null, 'login_failed', ip, {
        userAgent,
        reason: 'user_not_found',
        email: normalizedEmail,
      });

      return NextResponse.json(
        { error: 'بيانات تسجيل الدخول غير صحيحة.' },
        { status: 401 },
      );
    }

    const passwordMatches = await AuthService.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await authService.recordFailedAttempt(clientId);
      await authService.logSecurityEvent(user.id, 'login_failed', ip, {
        userAgent,
        reason: 'invalid_password',
      });

      return NextResponse.json(
        { error: 'بيانات تسجيل الدخول غير صحيحة.' },
        { status: 401 },
      );
    }

    if (user.twoFactorEnabled) {
      const code = generateTwoFactorCode();
      const challengeId = await TwoFactorChallengeService.createChallenge(
        user.id,
        code,
        TWO_FACTOR_TTL_MINUTES,
      );

      if (process.env.NODE_ENV !== 'production') {
        console.info(`[Auth] 2FA code for ${user.email}: ${code}`);
      }

      await authService.logSecurityEvent(
        user.id,
        'two_factor_challenge_created',
        ip,
        {
          userAgent,
          delivery: 'email',
          expiresInMinutes: TWO_FACTOR_TTL_MINUTES,
        },
      );

      return NextResponse.json({
        requiresTwoFactor: true,
        loginAttemptId: challengeId,
        expiresAt: new Date(
          Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000,
        ).toISOString(),
        methods: ['email'],
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      });
    }

    await authService.resetRateLimit(clientId);
    await authService.updateLastLogin(user.id);

    const session = await authService.createSession(user.id, userAgent, ip);
    const { accessToken, refreshToken } = await authService.createTokens(
      {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || undefined,
      },
      session.id,
    );

    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: new Date(),
        },
      })
      .catch(() => undefined);

    await authService.logSecurityEvent(user.id, 'login_success', ip, {
      userAgent,
      sessionId: session.id,
    });

    const response = NextResponse.json({
      message: 'تم تسجيل الدخول بنجاح.',
      token: accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user as any).role || 'user',
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
      },
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    await authService.logSecurityEvent(null, 'login_error', ip, {
      userAgent,
    });

    return NextResponse.json(
      {
        error:
          'حدث خطأ غير متوقع أثناء معالجة طلب تسجيل الدخول. حاول مرة أخرى لاحقاً.',
      },
      { status: 500 },
    );
  }
}
