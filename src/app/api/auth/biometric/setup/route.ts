import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { generateSecureToken } from '@/lib/security-utils';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';
import {
  createErrorResponse,
  createSuccessResponse,
  withDatabaseRetry
} from '@/lib/auth-utils';

/**
 * POST /api/auth/biometric/setup
 * تفعيل المصادقة البيومترية للمستخدم
 * 
 * NOTE: This is a mock WebAuthn implementation.
 * In production, use proper WebAuthn/FIDO2 libraries like @simplewebauthn/server
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // التحقق من التوكن باستخدام authService
      const token = authService.extractToken(req);
      if (!token) {
        return createErrorResponse(
          { error: 'Authorization required', code: 'NO_TOKEN' },
          'يجب تسجيل الدخول أولاً',
          401
        );
      }

      const decoded = await authService.verifyTokenFromInput(token);
      if (!decoded.isValid || !decoded.user?.userId) {
        return createErrorResponse(
          { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
          'رمز المصادقة غير صالح أو منتهي الصلاحية',
          401
        );
      }

      // جلب المستخدم مع إعادة المحاولة
      const user = await withDatabaseRetry(
        async () => prisma.user.findUnique({ where: { id: decoded.user!.userId } }),
        { maxAttempts: 3, operationName: 'find user for biometric setup' }
      );

      if (!user) {
        return createErrorResponse(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          'المستخدم غير موجود',
          404
        );
      }

      // توليد بيانات بيومترية وهمية 
      // TODO: في التطبيق الحقيقي استخدم @simplewebauthn/server لتوليد WebAuthn credentials
      const credentialId = generateSecureToken(32);
      const publicKey = generateSecureToken(64);
      const deviceName = req.headers.get('user-agent') || 'Unknown device';

      // حفظ بيانات الاعتماد البيومترية
      await withDatabaseRetry(
        async () => prisma.biometricCredential.create({
          data: {
            userId: user.id,
            credentialId,
            publicKey,
            deviceType: deviceName,
            transports: JSON.stringify([]),
          }
        }),
        { maxAttempts: 3, operationName: 'create biometric credential' }
      );

      // تفعيل المصادقة البيومترية للمستخدم
      await withDatabaseRetry(
        async () => prisma.user.update({
          where: { id: user.id },
          data: { biometricEnabled: true }
        }),
        { maxAttempts: 3, operationName: 'enable biometric for user' }
      );

      logger.info('Biometric setup completed', { userId: user.id });

      return createSuccessResponse({
        message: 'تم إعداد المصادقة البيومترية بنجاح',
        credentialId,
        challenge: generateSecureToken(32)
      });
    } catch (error) {
      logger.error('Biometric setup error:', error);
      return createErrorResponse(error, 'فشل إعداد المصادقة البيومترية', 500);
    }
  });
}

/**
 * DELETE /api/auth/biometric/setup
 * إزالة المصادقة البيومترية للمستخدم
 */
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // التحقق من التوكن باستخدام authService
      const token = authService.extractToken(req);
      if (!token) {
        return createErrorResponse(
          { error: 'Authorization required', code: 'NO_TOKEN' },
          'يجب تسجيل الدخول أولاً',
          401
        );
      }

      const decoded = await authService.verifyTokenFromInput(token);
      if (!decoded.isValid || !decoded.user?.userId) {
        return createErrorResponse(
          { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
          'رمز المصادقة غير صالح',
          401
        );
      }

      // حذف بيانات الاعتماد البيومترية للمستخدم
      await withDatabaseRetry(
        async () => prisma.biometricCredential.deleteMany({
          where: { userId: decoded.user!.userId }
        }),
        { maxAttempts: 3, operationName: 'delete biometric credentials' }
      );

      // تعطيل المصادقة البيومترية للمستخدم
      await withDatabaseRetry(
        async () => prisma.user.update({
          where: { id: decoded.user!.userId },
          data: { biometricEnabled: false }
        }),
        { maxAttempts: 3, operationName: 'disable biometric for user' }
      );

      logger.info('Biometric removed', { userId: decoded.user!.userId });

      return createSuccessResponse({
        message: 'تم إزالة المصادقة البيومترية بنجاح'
      });
    } catch (error) {
      logger.error('Biometric removal error:', error);
      return createErrorResponse(error, 'فشل إزالة المصادقة البيومترية', 500);
    }
  });
}
