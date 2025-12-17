import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/services/auth-service';
import { generateSecureToken } from '@/lib/security-utils';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // التحقق من وجود هيدر التوثيق وصحته
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization header missing or invalid' },
          { status: 401 }
        );
      }

      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
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
      const deviceName = req.headers.get('user-agent') || 'Unknown device';

      // حفظ بيانات الاعتماد البيومترية
      await prisma.biometricCredential.create({
        data: {
          userId: user.id,
          credentialId,
          publicKey,
          deviceType: deviceName,
          transports: JSON.stringify([]),
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
      logger.error('Biometric setup error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // التحقق من وجود هيدر التوثيق وصحته
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization header missing or invalid' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded?.userId) {
        return NextResponse.json(
          { error: 'Invalid token payload' },
          { status: 401 }
        );
      }

      // حذف بيانات الاعتماد البيومترية للمستخدم
      await prisma.biometricCredential.deleteMany({
        where: { userId: decoded.userId }
      });

      // تعطيل المصادقة البيومترية للمستخدم
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { biometricEnabled: false }
      });

      return NextResponse.json({
        message: 'تم إزالة المصادقة البيومترية بنجاح'
      });
    } catch (error) {
      logger.error('Biometric removal error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
