import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-old'; // Adjust path as needed
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // In a real implementation, you would use proper authentication
    // For now, we'll just simulate the endpoint
    const { enable, userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate a secret for 2FA if enabling
    let twoFactorSecret = null;
    if (enable) {
      twoFactorSecret = randomBytes(20).toString('hex');
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enable,
        twoFactorSecret,
      },
    });

    return NextResponse.json({
      message: enable 
        ? 'Two-factor authentication enabled successfully' 
        : 'Two-factor authentication disabled successfully',
      user: {
        id: user.id,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Error updating two-factor authentication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}