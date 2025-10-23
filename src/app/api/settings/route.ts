import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubjectType, FocusStrategy } from "@prisma/client";
import { SettingsUpdateRequest } from "@/types/settings";
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
			return NextResponse.json({ error: "Forbidden: Can only access your own settings" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in query
		const targetUserId = userId || authUser.userId;

		const user = await prisma.user.findUnique({
			where: { id: targetUserId },
			select: { id: true, wakeUpTime: true, sleepTime: true, focusStrategy: true }
		});

		const subjects = await prisma.subjectEnrollment.findMany({
			where: { userId: targetUserId },
			orderBy: { subject: "asc" }
		});

		return NextResponse.json({ user, subjects });
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

		const body: SettingsUpdateRequest = await req.json();
		const { userId, wakeUpTime, sleepTime, focusStrategy, subjects } = body;

		// If userId is provided in body, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			return NextResponse.json({ error: "Forbidden: Can only update your own settings" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in body
		const targetUserId = userId || authUser.userId;

		await prisma.user.update({
			where: { id: targetUserId },
			data: {
				wakeUpTime: wakeUpTime ?? null,
				sleepTime: sleepTime ?? null,
				focusStrategy: focusStrategy ?? null
			}
		});

		if (Array.isArray(subjects)) {
			const existing = await prisma.subjectEnrollment.findMany({ where: { userId: targetUserId } });
			const keepSet = new Set(subjects.map((s) => s.subject));
			const toDelete = existing.filter((e) => !keepSet.has(e.subject)).map((e) => e.id);
			if (toDelete.length) {
				await prisma.subjectEnrollment.deleteMany({ where: { id: { in: toDelete } } });
			}
			for (const s of subjects) {
				await prisma.subjectEnrollment.upsert({
					where: { userId_subject: { userId: targetUserId, subject: s.subject } },
					update: { targetWeeklyHours: s.targetWeeklyHours },
					create: { userId: targetUserId, subject: s.subject, targetWeeklyHours: s.targetWeeklyHours },
				});
			}
		}
		return NextResponse.json({ ok: true });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}
