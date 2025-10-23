import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-enhanced';
import { generateSecureToken } from '@/lib/security-utils';

export async function POST(request: NextRequest) {
  try {
    // التحقق من وجود هيدر التوثيق وصحته
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // جلب المستخدم
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // توليد بيانات بيومترية وهمية (في التطبيق الحقيقي يتم توليد بيانات WebAuthn)
    const credentialId = generateSecureToken(32);
    const publicKey = generateSecureToken(64);
    const deviceName = request.headers.get('user-agent') || 'Unknown device';

    // حفظ بيانات الاعتماد البيومترية
    await prisma.biometricCredential.create({
      data: {
        userId: user.id,
        credentialId,
        publicKey,
        deviceName,
        createdAt: new Date()
      }
    });

    // تفعيل المصادقة البيومترية للمستخدم
    await prisma.user.update({
      where: { id: user.id },
      data: { biometricEnabled: true }
    });

    return NextResponse.json({
      message: 'تم إعداد المصادقة البيومترية بنجاح',
      credentialId,
      challenge: generateSecureToken(32)
    });
  } catch (error) {
    console.error('Biometric setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // التحقق من وجود هيدر التوثيق وصحته
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // جلب المستخدم
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // حذف جميع بيانات الاعتماد البيومترية للمستخدم
    await prisma.biometricCredential.deleteMany({
      where: { userId: user.id }
    });

    // تعطيل المصادقة البيومترية للمستخدم
    await prisma.user.update({
      where: { id: user.id },
      data: { biometricEnabled: false }
    });

    return NextResponse.json({
      message: 'تم تعطيل المصادقة البيومترية بنجاح'
    });
  } catch (error) {
    console.error('Biometric disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
