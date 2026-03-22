import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";

export async function GET(request: NextRequest) {
	return opsWrapper(request, async () => {
		const resources = await prisma.resource.findMany({ orderBy: { createdAt: "desc" } });
		// Return the array directly to match integration test expectations.
		return NextResponse.json(resources, { status: 200 });
	});
}