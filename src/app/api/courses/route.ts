import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSetEnhanced } from '@/lib/cache-service-unified';
import { logger } from '@/lib/logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { 
  parseRequestBody, 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

// GET all courses (now subjects)
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get("userId");

      // Validate userId if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        const response = NextResponse.json(
          { error: "معرف المستخدم غير صحيح", code: 'INVALID_USER_ID' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      const trimmedUserId = userId?.trim() || null;
    
      // Get all subjects with timeout protection
      const subjectsPromise = getOrSetEnhanced(
        'subjects:all',
        async () => {
          const fetchPromise = prisma.subject.findMany({
            where: {
              isActive: true
            },
            orderBy: {
              name: 'asc'
            }
          });

          const timeoutPromise = new Promise<never>((resolve, reject) => {
            setTimeout(() => reject(new Error('Database query timeout')), 10000);
          });

          return await Promise.race([fetchPromise, timeoutPromise]);
        },
        300 // Cache for 5 minutes
      );

      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Cache operation timeout')), 5000);
      });

      const subjects = await Promise.race([subjectsPromise, timeoutPromise]);

      // If userId is provided, get enrollment information with timeout protection
      let enrollments = {};
      if (trimmedUserId) {
        try {
          const enrollmentsPromise = prisma.subjectEnrollment.findMany({
            where: {
              userId: trimmedUserId
            }
          });

          const enrollmentsTimeoutPromise = new Promise<never>((resolve, reject) => {
            setTimeout(() => reject(new Error('Database query timeout')), 5000);
          });

          const userEnrollments = await Promise.race([enrollmentsPromise, enrollmentsTimeoutPromise]);
          
          enrollments = userEnrollments.reduce((acc: any, enrollment: any) => {
            if (enrollment.subject) {
              acc[enrollment.subject] = enrollment;
            }
            return acc;
          }, {});
        } catch (enrollmentError) {
          // Log but don't block response - enrollments are optional
          logger.warn('Error fetching enrollments:', enrollmentError);
        }
      }

      const response = NextResponse.json({
        subjects,
        enrollments
      });
      return addSecurityHeaders(response);
    } catch (error) {
      logger.error("Error fetching subjects:", error);
      return createStandardErrorResponse(
        error,
        "حدث خطأ أثناء معالجة الطلب"
      );
    }
  });
}

// POST to create a new course (now subject)
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Parse request body with timeout protection using standardized helper
      const bodyResult = await parseRequestBody<{
        name?: string;
        nameAr?: string;
        code?: string;
        description?: string;
        color?: string;
        icon?: string;
      }>(req, {
        maxSize: 2048, // 2KB max
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const body = bodyResult.data;

      const { name, nameAr, code, description, color, icon } = body;

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        const response = NextResponse.json(
          { error: "الاسم مطلوب", code: 'MISSING_NAME' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (!nameAr || typeof nameAr !== 'string' || nameAr.trim().length === 0) {
        const response = NextResponse.json(
          { error: "الاسم بالعربية مطلوب", code: 'MISSING_NAME_AR' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        const response = NextResponse.json(
          { error: "الرمز مطلوب", code: 'MISSING_CODE' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Validate field lengths
      if (name.trim().length > 200) {
        const response = NextResponse.json(
          { error: "الاسم طويل جداً (الحد الأقصى 200 حرف)", code: 'NAME_TOO_LONG' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (nameAr.trim().length > 200) {
        const response = NextResponse.json(
          { error: "الاسم بالعربية طويل جداً (الحد الأقصى 200 حرف)", code: 'NAME_AR_TOO_LONG' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (code.trim().length > 50) {
        const response = NextResponse.json(
          { error: "الرمز طويل جداً (الحد الأقصى 50 حرف)", code: 'CODE_TOO_LONG' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (description && typeof description === 'string' && description.trim().length > 1000) {
        const response = NextResponse.json(
          { error: "الوصف طويل جداً (الحد الأقصى 1000 حرف)", code: 'DESCRIPTION_TOO_LONG' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      const trimmedCode = code.trim().toUpperCase();

      // Check if subject with this name already exists with timeout protection
      const findPromise = prisma.subject.findUnique({
        where: { name: name.trim() }
      });

      const findTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const existingSubject = await Promise.race([findPromise, findTimeoutPromise]);

      if (existingSubject) {
        const response = NextResponse.json(
          { error: "توجد مادة بنفس الاسم بالفعل", code: 'DUPLICATE_NAME' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Validate color format if provided
      if (color && typeof color === 'string') {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(color.trim())) {
          const response = NextResponse.json(
            { error: "تنسيق اللون غير صحيح (يجب أن يكون hex color)", code: 'INVALID_COLOR' },
            { status: 400 }
          );
          return addSecurityHeaders(response);
        }
      }

      // Create new subject with timeout protection
      const createPromise = prisma.subject.create({
        data: {
          name: name.trim(),
          // nameAr: nameAr?.trim(), // Not in schema
          // code: trimmedCode, // Not in schema
          description: description?.trim() || null,
          color: (color && typeof color === 'string') ? color.trim() : '#3b82f6',
          icon: (icon && typeof icon === 'string') ? icon.trim() : 'BookOpen',
          isActive: true
        }
      });

      const createTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 10000);
      });

      const newSubject = await Promise.race([createPromise, createTimeoutPromise]);

      // Invalidate cache (non-blocking)
      // In a real implementation, you might want to invalidate related caches as well
      import('@/lib/cache-service-unified').then(({ CacheService }) => {
        CacheService.del('subjects:all').catch((error) => {
          logger.warn('Cache invalidation failed:', error);
        });
      }).catch(() => {
        // Ignore import errors
      });

      return createSuccessResponse(newSubject, undefined, 201);
    } catch (error) {
      logger.error("Error creating subject:", error);
      return createStandardErrorResponse(
        error,
        "حدث خطأ أثناء معالجة الطلب"
      );
    }
  });
}

