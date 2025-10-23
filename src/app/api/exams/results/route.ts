import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");
		if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
		const results = await prisma.examResult.findMany({ 
			where: { userId }, 
			include: { 
				exam: true,
				teacher: true
			}, 
			orderBy: { takenAt: "desc" } 
		});
		return NextResponse.json(results);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { userId, examId, score, takenAt, teacherId } = body;
		if (!userId || !examId || typeof score !== "number") return NextResponse.json({ error: "userId, examId, score required" }, { status: 400 });
		const result = await prisma.examResult.create({ 
			data: { 
				userId, 
				examId, 
				score, 
				takenAt: takenAt ? new Date(takenAt) : undefined,
				teacherId
			},
			include: {
				exam: true,
				teacher: true
			}
		});
		return NextResponse.json(result);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
} 