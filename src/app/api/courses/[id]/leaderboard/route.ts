import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, handleApiError } from "@/lib/api-utils";

export async function GET(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { id: courseId } = await params;

      const leaderboard = await prisma.leaderboardEntry.findMany({
        where: { subjectId: courseId },
        include: {
          user: {
            select: {
              name: true,
              avatar: true,
              level: true,
              totalXP: true
            }
          }
        },
        orderBy: { totalXP: "desc" },
        take: 5
      });

      return successResponse(leaderboard);
    } catch (error) {
      return handleApiError(error);
    }
  });
}