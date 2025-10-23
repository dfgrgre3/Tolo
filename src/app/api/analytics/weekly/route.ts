import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfDay } from "date-fns";
import { CacheService } from "@/lib/redis";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");
		if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

		// Create a cache key based on userId and current week
		const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
		const cacheKey = `analytics:weekly:${userId}:${weekStart.toISOString()}`;

		// Try to get from cache first
		const cachedData = await CacheService.get(cacheKey);
		if (cachedData) {
			return NextResponse.json(cachedData);
		}

		const weekEnd = endOfWeek(new Date(), { weekStartsOn: 6 });
		const sessions = await prisma.studySession.findMany({ where: { userId, startTime: { gte: weekStart, lte: weekEnd } } });

		const bySubject: Record<string, number> = {};
		sessions.forEach((s) => {
			bySubject[s.subject] = (bySubject[s.subject] || 0) + s.durationMin;
		});

		const days = eachDayOfInterval({ start: startOfDay(subDays(new Date(), 6)), end: startOfDay(new Date()) });
		const byDay = days.map((d) => {
			const total = sessions
				.filter((s) => startOfDay(s.startTime).getTime() === startOfDay(d).getTime())
				.reduce((a, s) => a + s.durationMin, 0);
			return { date: d, minutes: total };
		});

		const result = { bySubject, byDay };
		
		// Cache the result for 15 minutes (900 seconds)
		await CacheService.set(cacheKey, result, 900);

		return NextResponse.json(result);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}