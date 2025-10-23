import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	const resources = await prisma.resource.findMany({ orderBy: { createdAt: "desc" } });
	return NextResponse.json(resources);
}