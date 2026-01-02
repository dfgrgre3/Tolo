import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { registerSchema } from '@/lib/validations/auth';
import { setAuthCookies, createErrorResponse } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Body
    const parsed = registerSchema.safeParse(body);
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

    const { email, password, name } = parsed.data;

    // 2. Check if user already exists
    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل', code: 'EMAIL_IN_USE' },
        { status: 409 }
      );
    }

    // 3. Create User
    const newUser = await authService.createUser(parsed.data);

    // 4. Generate Tokens
    // Ensure role is a string
    const userRole = newUser.role || "USER";
    const tokenPayload = { userId: newUser.id, email: newUser.email, role: userRole };
    const accessToken = await authService.generateToken(tokenPayload, '1h');
    const refreshToken = await authService.generateToken(tokenPayload, '1d');

    // 5. Create Response
    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userRole,
        image: newUser.avatar
      },
      token: accessToken
    }, { status: 201 });

    // 6. Set Cookies
    setAuthCookies(response, accessToken, refreshToken, false);

    return response;

  } catch (error) {
    console.error('Register route error:', error);
    return createErrorResponse(error);
  }
}

