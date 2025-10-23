import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import { TextEncoder } from 'util';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
  isStrongPassword
} from '@/lib/api-utils';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 
  process.env.NEXTAUTH_SECRET || 
  'your-secret-key'
);

// Validation schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, registerSchema);
    if (!validation.success) {
      return createErrorResponse('Invalid request data', 400, { details: validation.error }, 'VALIDATION_ERROR');
    }

    const { email, password, name } = validation.data;

    // Validate password strength
    const passwordValidation = isStrongPassword(password);
    if (!passwordValidation.isValid) {
      return createErrorResponse(
        'Password does not meet security requirements',
        400,
        {
          feedback: passwordValidation.feedback,
          requirements: passwordValidation.requirements,
          score: passwordValidation.score
        },
        'WEAK_PASSWORD'
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return createErrorResponse(
        'User with this email already exists', 
        409, 
        undefined, 
        'USER_EXISTS'
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        emailVerificationToken,
        emailVerificationExpires
      }
    });

    // In a real app, you would send an email with the verification link
    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;

    // Create JWT token for immediate login (optional)
    const token = await new SignJWT({ 
      userId: newUser.id, 
      email: newUser.email, 
      name: newUser.name 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Return user data without password
    const { passwordHash: _removed, ...userData } = newUser;

    return createSuccessResponse({
      message: 'Registration successful. Please check your email to verify your account.',
      user: userData,
      token,
      verificationLink // Remove this in production
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse('Internal server error', 500, undefined, 'INTERNAL_ERROR');
  }
}
