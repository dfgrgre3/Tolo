import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';
import { RegisterService } from '@/lib/services/register-service';
import { registerSchema } from '@/lib/auth/schemas';
import {
  createStandardErrorResponse,
  parseRequestBody,
  extractRequestMetadata,
  addSecurityHeaders,
  logSecurityEventSafely
} from '@/app/api/auth/_helpers';
import type { RegisterResponse } from '@/types/api/auth';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Parse and validate request body using standardized helper
      const bodyResult = await parseRequestBody<{
        email?: string;
        password?: string;
        name?: string;
      }>(req, {
        maxSize: 2048, // 2KB max for registration
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const parsed = registerSchema.safeParse(bodyResult.data);

      if (!parsed.success) {
        return createStandardErrorResponse(
          {
            error: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
          },
          'تعذر معالجة البيانات المدخلة.',
          400
        );
      }

      // Delegate business logic to RegisterService
      const result = await RegisterService.register(parsed.data, ip, userAgent);

      if (result.success) {
        const response = NextResponse.json(result.response, { status: result.statusCode });
        return addSecurityHeaders(response);
      } else {
        // Handle error response
        const errorResponse = NextResponse.json(result.response, { status: result.statusCode });
        return addSecurityHeaders(errorResponse);
      }

    } catch (error: unknown) {
      logger.error('Registration route error:', error);

      // Log security event safely
      await logSecurityEventSafely(null, 'register_error', {
        ip,
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return appropriate error response
      return createStandardErrorResponse(
        error,
        'حدث خطأ غير متوقع أثناء التسجيل. حاول مرة أخرى لاحقاً.'
      );
    }
  });
}