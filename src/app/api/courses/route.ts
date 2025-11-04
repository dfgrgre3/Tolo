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
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(cachedData);
    }

    // Fetch data if not in cache
    console.log(`Cache miss for key: ${key}, fetching data...`);
    const freshData = await fetchFn();

    // Store in cache with TTL
    await redis.setex(key, ttl, JSON.stringify(freshData));
    
    return freshData;
  } catch (error) {
    console.warn(`Cache error for key ${key}:`, error);
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
    console.log(`Cache invalidated for key: ${key}`);
  } catch (error) {
    console.error(`Error invalidating cache for key ${key}:`, error);
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
import { getOrSetEnhanced } from '@/lib/cache-service-enhanced';

// GET all courses (now subjects)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    // Get all subjects
    const subjects = await getOrSetEnhanced(
      'subjects:all',
      async () => {
        return await prisma.subject.findMany({
          where: {
            isActive: true
          },
          orderBy: {
            name: 'asc'
          }
        });
      }
    );

    // If userId is provided, get enrollment information
    let enrollments = {};
    if (userId) {
      const userEnrollments = await prisma.subjectEnrollment.findMany({
        where: {
          userId
        }
      });
      
      enrollments = userEnrollments.reduce((acc: any, enrollment: any) => {
        acc[enrollment.subject] = enrollment;
        return acc;
      }, {});
    }

    return NextResponse.json({
      subjects,
      enrollments
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

// POST to create a new course (now subject)
export async function POST(request: NextRequest) {
  try {
    const { name, nameAr, code, description, color, icon } = await request.json();

    // Validate required fields
    if (!name || !nameAr || !code) {
      return NextResponse.json(
        { error: "الاسم والرمز مطلوبان" },
        { status: 400 }
      );
    }

    // Check if subject with this code already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { code }
    });

    if (existingSubject) {
      return NextResponse.json(
        { error: "توجد مادة بنفس الرمز بالفعل" },
        { status: 400 }
      );
    }

    // Create new subject
    const newSubject = await prisma.subject.create({
      data: {
        name,
        nameAr,
        code,
        description,
        color: color || '#3b82f6',
        icon: icon || 'BookOpen',
        isActive: true
      }
    });

    // Invalidate cache
    // In a real implementation, you might want to invalidate related caches as well

    return NextResponse.json(newSubject);
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
