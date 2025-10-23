import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
	try {
		const { email, password, name } = await req.json();
		if (!email || !password) {
			return NextResponse.json({ error: "email and password required" }, { status: 400 });
		}
		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json({ error: "Email already registered" }, { status: 409 });
		}
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({ data: { email, passwordHash, name } });
		return NextResponse.json({ id: user.id, email: user.email, name: user.name });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
} 