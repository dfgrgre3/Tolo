import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		await prisma.examResult.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
} 