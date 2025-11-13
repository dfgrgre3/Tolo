import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

export async function GET(request: NextRequest) {
	return opsWrapper(request, async () => {
		const resources = await prisma.resource.findMany({ orderBy: { createdAt: "desc" } });
		return NextResponse.json(resources);
	});
}