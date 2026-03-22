import { prisma } from '@/lib/prisma';
import { cacheMultipleEducationalItems } from "@/lib/educational-cache-service";
import { CacheService } from "@/lib/cache-service-unified";

import { logger } from '@/lib/logger';

/**
 * Cache Warming Service
 * Proactively populates cache with frequently accessed data to improve response times
 */

// Warm educational content cache
export async function warmEducationalContentCache(): Promise<void> {
  try {
    logger.info('Starting educational content cache warming...');
    
    // Fetch frequently accessed subjects from enrollments
    // Note: There's no Subject model, so we get subjects from SubjectEnrollment
    const subjectEnrollments = await prisma.subjectEnrollment.groupBy({
      by: ['subjectId'],
      _count: {
        subjectId: true,
      },
      orderBy: {
        _count: {
          subjectId: 'desc',
        },
      },
      take: 50,
    });
    
    const subjects = subjectEnrollments.map((se) => ({
      id: se.subjectId,
      subject: se.subjectId,
      enrollmentCount: se._count.subjectId,
    }));
    
    // Prepare cache items for subjects
    const subjectCacheItems = subjects.map((subject: any) => ({
      key: `subject:${subject.subject}`,
      data: subject,
      ttl: 3600 // 1 hour
    }));
    
    // Cache subjects
    await cacheMultipleEducationalItems(subjectCacheItems);
    
    // Note: Course model may not exist, so we skip course caching for now
    // If Course model exists, uncomment the following:
    /*
    const courses = await prisma.course.findMany({
      where: {
        subjectId: {
          in: subjects.map((s: any) => s.subject)
        },
        published: true,
      },
      take: 100, // Top 100 courses
      orderBy: {
        enrollments: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: { enrollments: true }
        },
        subject: true
      }
    });
    */
    const courses: any[] = [];
    
    // Prepare cache items for courses
    const courseCacheItems = courses.map((course: any) => ({
      key: `course:${course.id}`,
      data: course,
      ttl: 1800 // 30 minutes
    }));
    
    // Cache courses
    await cacheMultipleEducationalItems(courseCacheItems);
    
    logger.info(`Warmed cache with ${subjects.length} subjects and ${courses.length} courses`);
  } catch (error) {
    logger.error('Error warming educational content cache:', error);
  }
}

// Warm user analytics cache
export async function warmUserAnalyticsCache(): Promise<void> {
  try {
    logger.info('Starting user analytics cache warming...');
    
    // Find active users (users with recent study sessions)
    const activeUsers = await prisma.user.findMany({
      where: {
        studySessions: {
          some: {
            startTime: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }
      },
      take: 100, // Top 100 active users
      select: {
        id: true
      }
    });
    
    // For each active user, warm their analytics cache
    for (const user of activeUsers) {
      try {
        // Fetch user's recent study data
        const studySessions = await prisma.studySession.findMany({
          where: {
            userId: user.id,
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: {
            startTime: 'desc'
          },
          take: 50
        });
        
        // Cache the data
        await CacheService.set(
          `analytics:user:${user.id}:recent_sessions`,
          studySessions,
          900 // 15 minutes
        );
      } catch (userError) {
        logger.error(`Error warming cache for user ${user.id}:`, userError);
      }
    }
    
    logger.info(`Warmed analytics cache for ${activeUsers.length} active users`);
  } catch (error) {
    logger.error('Error warming user analytics cache:', error);
  }
}

// Warm system-wide statistics
export async function warmSystemStatsCache(): Promise<void> {
  try {
    logger.info('Starting system statistics cache warming...');
    
    // Cache total user count
    const userCount = await prisma.user.count();
    await CacheService.set('system:stats:user_count', userCount, 3600); // 1 hour
    
    // Note: Course model doesn't exist in schema, so we skip course count
    // If Course model is added later, uncomment the following:
    // const courseCount = await prisma.course.count();
    // await CacheService.set('system:stats:course_count', courseCount, 3600);
    await CacheService.set('system:stats:course_count', 0, 3600); // Placeholder
    
    // Cache total subject count (count distinct subjects from enrollments)
    const subjectCountResult = await prisma.subjectEnrollment.groupBy({
      by: ['subjectId'],
    });
    const subjectCount = subjectCountResult.length;
    await CacheService.set('system:stats:subject_count', subjectCount, 3600); // 1 hour
    
    logger.info('Warmed system statistics cache');
  } catch (error) {
    logger.error('Error warming system statistics cache:', error);
  }
}

// Main cache warming function
export async function warmAllCache(): Promise<void> {
  logger.info('Starting full cache warming process...');
  
  const start = Date.now();
  
  // Warm different types of cache in parallel
  await Promise.all([
    warmEducationalContentCache(),
    warmUserAnalyticsCache(),
    warmSystemStatsCache()
  ]);
  
  const duration = Date.now() - start;
  logger.info(`Cache warming completed in ${duration}ms`);
}

export class CacheWarmingService {
  // ... 7?8 8~8y7? 7?87?7?8&7? ...
}
