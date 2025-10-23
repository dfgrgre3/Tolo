import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, SubjectType } from "@prisma/client";

export async function GET() {
	const teachers = await prisma.teacher.findMany({ orderBy: { name: "asc" } });
	return NextResponse.json(teachers);
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { name, subject, onlineUrl, rating, notes } = body;
		if (!name || !subject) return NextResponse.json({ error: "name and subject required" }, { status: 400 });
		const t = await prisma.teacher.create({ data: { name, subject, onlineUrl: onlineUrl ?? null, rating: rating ?? null, notes: notes ?? null } });
		return NextResponse.json(t);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
} 