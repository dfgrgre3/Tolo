import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { loginSchema } from '@/lib/validations/auth';
import { setAuthCookies, createErrorResponse } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Body
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'بيانات غير صالحة',
          details: parsed.error.flatten().fieldErrors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = parsed.data;

    // 2. Find User
    const user = await authService.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      // NOTE: user.passwordHash check is for OAuth users who might not have a password
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // 3. Verify Password
    const isValid = await authService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // 4. Generate Tokens
    // Ensure role is a string (default to USER if null)
    const userRole = user.role || "USER";
    const tokenPayload = { userId: user.id, email: user.email, role: userRole };
    const accessToken = await authService.generateToken(tokenPayload, '1h');
    const refreshToken = await authService.generateToken(tokenPayload, rememberMe ? '30d' : '1d');

    // 5. Create Response
    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        image: user.avatar // Map avatar to image for frontend consistency if needed, or just use avatar
      },
      token: accessToken,       // للتوافق مع الكود الحالي
      accessToken: accessToken  // <-- أضف هذا السطر لحل مشكلة MISSING_TOKEN
    });

    // 6. Set Cookies
    setAuthCookies(response, accessToken, refreshToken, rememberMe);

    return response;

  } catch (error) {
    console.error('Login route error:', error);
    return createErrorResponse(error);
  }
}


