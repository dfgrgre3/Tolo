import { Redis } from 'ioredis';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

/**
 * Get data from cache or fetch and cache it
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if not in cache
 * @param ttl - Time to live in seconds
 * @returns Cached or fetched data
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  try {
    // Try to get data from cache
    const cachedData = await redis.get(key);
    if (cachedData) {
      logger.info(`Cache hit for key: ${key}`);
      return JSON.parse(cachedData);
    }

    // Fetch data if not in cache
    logger.info(`Cache miss for key: ${key}, fetching data...`);
    const freshData = await fetchFn();

    // Store in cache with TTL
    await redis.setex(key, ttl, JSON.stringify(freshData));
    
    return freshData;
  } catch (error) {
    logger.warn(`Cache error for key ${key}:`, error);
    // If cache fails, just fetch the data
    return fetchFn();
  }
}

/**
 * Invalidate cache for a specific key
 * @param key - Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    logger.info(`Cache invalidated for key: ${key}`);
  } catch (error) {
    logger.error(`Error invalidating cache for key ${key}:`, error);
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSetEnhanced } from '@/lib/cache-service-unified';

import { logger } from '@/lib/logger';

import { opsWrapper } from "@/lib/middleware/ops-middleware";

// GET all courses (now subjects)
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get("userId");

      // Validate userId if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        return NextResponse.json(
          { error: "معرف المستخدم غير صحيح", code: 'INVALID_USER_ID' },
          { status: 400 }
        );
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

      return NextResponse.json({
        subjects,
        enrollments
      });
    } catch (error) {
      logger.error("Error fetching subjects:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: "حدث خطأ أثناء معالجة الطلب",
          code: 'FETCH_ERROR',
          ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
        },
        { status: 500 }
      );
    }
  });
}

// POST to create a new course (now subject)
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Parse request body with timeout protection
      let body;
      try {
        const bodyPromise = req.json();
        const timeoutPromise = new Promise<never>((resolve, reject) => {
          setTimeout(() => reject(new Error('Request body parsing timeout')), 5000);
        });
        body = await Promise.race([bodyPromise, timeoutPromise]);
      } catch (parseError) {
        return NextResponse.json(
          { error: "تنسيق البيانات غير صحيح", code: 'PARSE_ERROR' },
          { status: 400 }
        );
      }

      const { name, nameAr, code, description, color, icon } = body;

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: "الاسم مطلوب", code: 'MISSING_NAME' },
          { status: 400 }
        );
      }

      if (!nameAr || typeof nameAr !== 'string' || nameAr.trim().length === 0) {
        return NextResponse.json(
          { error: "الاسم بالعربية مطلوب", code: 'MISSING_NAME_AR' },
          { status: 400 }
        );
      }

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return NextResponse.json(
          { error: "الرمز مطلوب", code: 'MISSING_CODE' },
          { status: 400 }
        );
      }

      // Validate field lengths
      if (name.trim().length > 200) {
        return NextResponse.json(
          { error: "الاسم طويل جداً (الحد الأقصى 200 حرف)", code: 'NAME_TOO_LONG' },
          { status: 400 }
        );
      }

      if (nameAr.trim().length > 200) {
        return NextResponse.json(
          { error: "الاسم بالعربية طويل جداً (الحد الأقصى 200 حرف)", code: 'NAME_AR_TOO_LONG' },
          { status: 400 }
        );
      }

      if (code.trim().length > 50) {
        return NextResponse.json(
          { error: "الرمز طويل جداً (الحد الأقصى 50 حرف)", code: 'CODE_TOO_LONG' },
          { status: 400 }
        );
      }

      if (description && typeof description === 'string' && description.trim().length > 1000) {
        return NextResponse.json(
          { error: "الوصف طويل جداً (الحد الأقصى 1000 حرف)", code: 'DESCRIPTION_TOO_LONG' },
          { status: 400 }
        );
      }

      const trimmedCode = code.trim().toUpperCase();

      // Check if subject with this code already exists with timeout protection
      const findPromise = prisma.subject.findUnique({
        where: { code: trimmedCode }
      });

      const findTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const existingSubject = await Promise.race([findPromise, findTimeoutPromise]);

      if (existingSubject) {
        return NextResponse.json(
          { error: "توجد مادة بنفس الرمز بالفعل", code: 'DUPLICATE_CODE' },
          { status: 400 }
        );
      }

      // Validate color format if provided
      if (color && typeof color === 'string') {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(color.trim())) {
          return NextResponse.json(
            { error: "تنسيق اللون غير صحيح (يجب أن يكون hex color)", code: 'INVALID_COLOR' },
            { status: 400 }
          );
        }
      }

      // Create new subject with timeout protection
      const createPromise = prisma.subject.create({
        data: {
          name: name.trim(),
          nameAr: nameAr.trim(),
          code: trimmedCode,
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

      return NextResponse.json(newSubject, { status: 201 });
    } catch (error) {
      logger.error("Error creating subject:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: "حدث خطأ أثناء معالجة الطلب",
          code: 'CREATE_ERROR',
          ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
        },
        { status: 500 }
      );
    }
  });
}

