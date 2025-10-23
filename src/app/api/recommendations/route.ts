import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");
		if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

		const [user, tasks, sessions, enrollments] = await Promise.all([
			prisma.user.findUnique({ where: { id: userId } }),
			prisma.task.findMany({ where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } }, orderBy: { priority: "desc" } }),
			prisma.studySession.findMany({ where: { userId, startTime: { gte: startOfWeek(new Date(), { weekStartsOn: 6 }), lte: endOfWeek(new Date(), { weekStartsOn: 6 }) } } }),
			prisma.subjectEnrollment.findMany({ where: { userId } }),
		]);

		const totalWeek = sessions.reduce((a, s) => a + s.durationMin, 0);
		const subjectWeek: Record<string, number> = {};
		sessions.forEach((s) => {
			subjectWeek[s.subject] = (subjectWeek[s.subject] || 0) + s.durationMin;
		});

		const recs: { title: string; message: string }[] = [];

		for (const e of enrollments) {
			const done = subjectWeek[e.subject] || 0;
			const target = e.targetWeeklyHours * 60;
			if (target > 0 && done < target) {
				recs.push({
					title: `زد وقت ${e.subject}`,
					message: `أنجزت ${Math.round(done / 60)} من ${e.targetWeeklyHours} ساعة هذا الأسبوع. خطط لجلسة ${e.subject} اليوم.`,
				});
			}
		}

		if (user?.focusStrategy === "POMODORO") {
			recs.push({ title: "Pomodoro", message: "نفّذ 4 دورات 25/5 مع استراحة أطول 15 دقيقة." });
		}

		if (tasks.length > 0) {
			recs.push({ title: "أهم مهمة", message: `ابدأ بـ: ${tasks[0].title}` });
		}

		return NextResponse.json(recs);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
} 