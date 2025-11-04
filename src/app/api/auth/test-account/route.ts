import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth-service';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

/**
 * Create test account endpoint
 * This endpoint creates a test user account for development/testing purposes
 * Only available in development mode or when NEXT_PUBLIC_ENABLE_TEST_ACCOUNTS is true
 */
export async function POST(request: NextRequest) {
  // Only allow in development or when explicitly enabled
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_TEST_ACCOUNTS !== 'true'
  ) {
    return NextResponse.json(
      { error: 'Test accounts are not available in production' },
      { status: 403 }
    );
  }

  try {
    const testEmail = 'test@example.com';
    const testPassword = 'Test123!@#';
    const testName = 'مستخدم تجريبي';

    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: true,
          message: 'الحساب التجريبي موجود بالفعل',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
          },
        },
        { status: 200 }
      );
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(testPassword);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate unique user ID
    const userId = uuidv4();

    // Create test user
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: testEmail,
        passwordHash,
        name: testName,
        emailVerificationToken,
        emailVerificationExpires,
        emailVerified: true, // Mark as verified for test accounts
        emailNotifications: true,
        smsNotifications: false,
        twoFactorEnabled: false,
        biometricEnabled: false,
        biometricCredentials: [],
        // Gamification defaults with some initial data
        totalXP: 100,
        level: 2,
        currentStreak: 5,
        longestStreak: 10,
        totalStudyTime: 3600, // 1 hour
        tasksCompleted: 15,
        examsPassed: 3,
        pomodoroSessions: 20,
        deepWorkSessions: 5,
        focusStrategy: 'POMODORO',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'تم إنشاء الحساب التجريبي بنجاح',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        credentials: {
          email: testEmail,
          password: testPassword,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating test account:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002' || error.message?.includes('unique')) {
      return NextResponse.json(
        {
          success: true,
          message: 'الحساب التجريبي موجود بالفعل',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: 'حدث خطأ أثناء إنشاء الحساب التجريبي',
        code: 'TEST_ACCOUNT_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

