import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-enhanced";

export async function GET(req: NextRequest) {
	try {
		// Authenticate user
		const authUser = verifyToken(req);
		if (!authUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");

		// If userId is provided in query, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			return NextResponse.json({ error: "Forbidden: Can only access your own lessons" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in query
		const targetUserId = userId || authUser.userId;

		const lessons = await prisma.offlineLesson.findMany({
			where: { userId: targetUserId },
			include: { teacher: true },
			orderBy: { startTime: "asc" }
		});
		return NextResponse.json(lessons);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		// Authenticate user
		const authUser = verifyToken(req);
		if (!authUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await req.json();
		const { userId, teacherId, title, location, startTime, endTime } = body;

		// If userId is provided in body, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			return NextResponse.json({ error: "Forbidden: Can only create lessons for yourself" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in body
		const targetUserId = userId || authUser.userId;

		if (!teacherId || !title || !location || !startTime || !endTime) {
			return NextResponse.json({ error: "missing fields" }, { status: 400 });
		}

		const lesson = await prisma.offlineLesson.create({
			data: {
				userId: targetUserId,
				teacherId,
				title,
				location,
				startTime: new Date(startTime),
				endTime: new Date(endTime)
			},
		});
		return NextResponse.json(lesson);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}
