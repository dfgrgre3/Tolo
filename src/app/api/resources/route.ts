import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
	return opsWrapper(request, async () => {
		const resources = await prisma.resource.findMany({ orderBy: { createdAt: "desc" } });
		return successResponse(resources);
	});
}