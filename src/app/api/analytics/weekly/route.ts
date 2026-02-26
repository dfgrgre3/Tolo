import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfDay } from "date-fns";
import { CacheService } from "@/lib/redis";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		try {
			const { searchParams } = new URL(request.url);
			const userId = searchParams.get("userId");

			if (!userId) {
				return NextResponse.json(
					{ error: "userId required" },
					{ status: 400 }
				);
			}

			// Create a cache key based on userId and current week
			const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
			const cacheKey = `analytics:weekly:${userId}:${weekStart.toISOString()}`;

			// Try to get from cache first
			const cachedData = await CacheService.get(cacheKey);
			if (cachedData) {
				return NextResponse.json(cachedData);
			}

			// Fetch sessions with error handling
			const weekEnd = endOfWeek(new Date(), { weekStartsOn: 6 });
			const sessions = await prisma.studySession.findMany({
				where: {
					userId,
					startTime: {
						gte: weekStart,
						lte: weekEnd
					}
				}
			}).catch((error: unknown) => {
				logger.error('Error fetching study sessions:', error);
				return [];
			});

			// Process subject data
			const bySubject: Record<string, number> = {};
			sessions.forEach((s) => {
				const subject = s.subjectId || 'Unknown';
				const duration = s.durationMin || 0;
				bySubject[subject] = (bySubject[subject] || 0) + duration;
			});

			// Process daily data
			const days = eachDayOfInterval({
				start: startOfDay(subDays(new Date(), 6)),
				end: startOfDay(new Date())
			});

			const byDay = days.map((d) => {
				const total = sessions
					.filter((s) => {
						if (!s.startTime) return false;
						const sessionDate = startOfDay(new Date(s.startTime));
						const dayDate = startOfDay(d);
						return sessionDate.getTime() === dayDate.getTime();
					})
					.reduce((a: number, s) => a + (s.durationMin || 0), 0);
				return { date: d, minutes: total };
			});

			const result = { bySubject, byDay };

			// Cache the result for 15 minutes (900 seconds)
			await CacheService.set(cacheKey, result, 900).catch((error: unknown) => {
				logger.error('Error caching analytics data:', error);
				// Continue even if caching fails
			});

			return NextResponse.json(result);
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			logger.error('Weekly analytics error:', e);
			return NextResponse.json(
				{ error: errorMessage ?? "Server error" },
				{ status: 500 }
			);
		}
	});
}