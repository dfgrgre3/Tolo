import { prisma } from "@/lib/prisma";
import { cacheMultipleEducationalItems } from "@/lib/educational-cache-service";
import { CacheService } from "@/lib/redis";

/**
 * Cache Warming Service
 * Proactively populates cache with frequently accessed data to improve response times
 */

// Warm educational content cache
export async function warmEducationalContentCache(): Promise<void> {
  try {
    console.log('Starting educational content cache warming...');
    
    // Fetch frequently accessed subjects
    const subjects = await prisma.subject.findMany({
      where: {
        published: true,
      },
      take: 50, // Top 50 subjects
      orderBy: {
        enrollments: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    });
    
    // Prepare cache items for subjects
    const subjectCacheItems = subjects.map(subject => ({
      key: `subject:${subject.id}`,
      data: subject,
      ttl: 3600 // 1 hour
    }));
    
    // Cache subjects
    await cacheMultipleEducationalItems(subjectCacheItems);
    
    // Fetch popular courses for these subjects
    const courses = await prisma.course.findMany({
      where: {
        subjectId: {
          in: subjects.map(s => s.id)
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
    
    // Prepare cache items for courses
    const courseCacheItems = courses.map(course => ({
      key: `course:${course.id}`,
      data: course,
      ttl: 1800 // 30 minutes
    }));
    
    // Cache courses
    await cacheMultipleEducationalItems(courseCacheItems);
    
    console.log(`Warmed cache with ${subjects.length} subjects and ${courses.length} courses`);
  } catch (error) {
    console.error('Error warming educational content cache:', error);
  }
}

// Warm user analytics cache
export async function warmUserAnalyticsCache(): Promise<void> {
  try {
    console.log('Starting user analytics cache warming...');
    
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
        console.error(`Error warming cache for user ${user.id}:`, userError);
      }
    }
    
    console.log(`Warmed analytics cache for ${activeUsers.length} active users`);
  } catch (error) {
    console.error('Error warming user analytics cache:', error);
  }
}

// Warm system-wide statistics
export async function warmSystemStatsCache(): Promise<void> {
  try {
    console.log('Starting system statistics cache warming...');
    
    // Cache total user count
    const userCount = await prisma.user.count();
    await CacheService.set('system:stats:user_count', userCount, 3600); // 1 hour
    
    // Cache total course count
    const courseCount = await prisma.course.count();
    await CacheService.set('system:stats:course_count', courseCount, 3600); // 1 hour
    
    // Cache total subject count
    const subjectCount = await prisma.subject.count();
    await CacheService.set('system:stats:subject_count', subjectCount, 3600); // 1 hour
    
    console.log('Warmed system statistics cache');
  } catch (error) {
    console.error('Error warming system statistics cache:', error);
  }
}

// Main cache warming function
export async function warmAllCache(): Promise<void> {
  console.log('Starting full cache warming process...');
  
  const start = Date.now();
  
  // Warm different types of cache in parallel
  await Promise.all([
    warmEducationalContentCache(),
    warmUserAnalyticsCache(),
    warmSystemStatsCache()
  ]);
  
  const duration = Date.now() - start;
  console.log(`Cache warming completed in ${duration}ms`);
}

export default {
  warmEducationalContentCache,
  warmUserAnalyticsCache,
  warmSystemStatsCache,
  warmAllCache
}
};