import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfDay } from "date-fns";
import {
  createErrorResponse,
  createSuccessResponse
} from '@/lib/api-utils';
import { cacheService } from "@/lib/cache-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return createErrorResponse("userId required", 400, undefined, 'MISSING_USER_ID');
    }

    // Create a cache key based on userId and current week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
    const cacheKey = `analytics:weekly:${userId}:${weekStart.toISOString()}`;

    // Try to get from cache first using unified cache service
    const cachedData = await cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const weekEnd = endOfWeek(new Date(), { weekStartsOn: 6 });

          // Fetch sessions with proper error handling
          const sessions = await prisma.studySession.findMany({
            where: {
              userId,
              startTime: {
                gte: weekStart,
                lte: weekEnd
              }
            }
          }).catch(error => {
            console.error('Error fetching study sessions:', error);
            return [];
          });

          // Process subject data
          const bySubject: Record<string, number> = {};
          sessions.forEach((s) => {
            bySubject[s.subject] = (bySubject[s.subject] || 0) + s.durationMin;
          });

          // Process daily data
          const days = eachDayOfInterval({
            start: startOfDay(subDays(new Date(), 6)),
            end: startOfDay(new Date())
          });

          const byDay = days.map((d) => {
            const total = sessions
              .filter((s) => startOfDay(s.startTime).getTime() === startOfDay(d).getTime())
              .reduce((a, s) => a + s.durationMin, 0);
            return { date: d, minutes: total };
          });

          return { bySubject, byDay };
        } catch (error) {
          console.error('Error processing analytics data:', error);
          return { bySubject: {}, byDay: [] };
        }
      },
      { ttl: 900, tags: [`user:${userId}`, 'analytics'] }, // Cache for 15 minutes with tags
      'analytics'
    );

    return createSuccessResponse(cachedData);
  } catch (e: any) {
    console.error('Weekly analytics error:', e);
    return createErrorResponse(
      e?.message ?? "Server error", 
      500, 
      undefined, 
      'ANALYTICS_ERROR'
    );
  }
}
