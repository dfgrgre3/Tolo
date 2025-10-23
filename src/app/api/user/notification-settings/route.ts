
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// جلب إعدادات الإشعارات
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user notification settings
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: { 
        emailNotifications: true,
        smsNotifications: true,
        phone: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications,
      smsNotifications: user.smsNotifications,
      phone: user.phone
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
}

// تحديث إعدادات الإشعارات
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { emailNotifications, smsNotifications, phone } = await request.json();

    // Update user notification settings
    const updatedUser = await prisma.user.update({
      where: { id: decodedToken.userId },
      data: {
        emailNotifications,
        smsNotifications,
        phone
      },
      select: {
        id: true,
        emailNotifications: true,
        smsNotifications: true,
        phone: true
      }
    });

    return NextResponse.json({
      success: true,
      emailNotifications: updatedUser.emailNotifications,
      smsNotifications: updatedUser.smsNotifications,
      phone: updatedUser.phone
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
