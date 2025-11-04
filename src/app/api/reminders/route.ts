import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");
		
		// Validate userId parameter
		if (!userId || userId === 'undefined' || userId.trim() === '') {
			return NextResponse.json({ error: "userId required" }, { status: 400 });
		}
		const reminders = await prisma.reminder.findMany({ where: { userId }, orderBy: { remindAt: "asc" } });
		return NextResponse.json(reminders);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { userId, title, message, remindAt, repeat } = body;
		
		// Validate required fields
		if (!userId || userId === 'undefined' || userId.trim() === '' || !title || !remindAt) {
			return NextResponse.json({ error: "userId, title, remindAt required" }, { status: 400 });
		}
		const reminder = await prisma.reminder.create({
			data: { userId, title, message: message ?? null, remindAt: new Date(remindAt), repeat: repeat ?? null },
		});
		return NextResponse.json(reminder);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
} 