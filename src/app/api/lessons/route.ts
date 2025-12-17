import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { authService } from "@/lib/services/auth-service";

export async function GET(req: NextRequest) {
	try {
		// Authenticate user
		const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
		if (!verification.isValid || !verification.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const authUser = verification.user;

		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");

		// If userId is provided in query, ensure it matches the authenticated user
		if (userId && userId !== authUser.id) {
			return NextResponse.json({ error: "Forbidden: Can only access your own lessons" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in query
		const targetUserId = userId || authUser.id;

		const lessons = await prisma.offlineLesson.findMany({
			where: { userId: targetUserId },
			orderBy: { startTime: "asc" }
		});
		return NextResponse.json(lessons);
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : "Server error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		// Authenticate user
		const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
		if (!verification.isValid || !verification.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const authUser = verification.user;

		const body = await req.json();
		const { userId, teacherId, title, location, startTime, endTime, subject } = body;

		// If userId is provided in body, ensure it matches the authenticated user
		if (userId && userId !== authUser.id) {
			return NextResponse.json({ error: "Forbidden: Can only create lessons for yourself" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in body
		const targetUserId = userId || authUser.id;

		if (!teacherId || !title || !location || !startTime || !endTime || !subject) {
			return NextResponse.json({ error: "missing fields" }, { status: 400 });
		}

		const lesson = await prisma.offlineLesson.create({
			data: {
				userId: targetUserId,
				teacherId,
				title,
				subject,
				location,
				startTime: new Date(startTime),
				endTime: new Date(endTime)
			},
		});
		return NextResponse.json(lesson);
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : "Server error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
