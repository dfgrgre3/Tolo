import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";
import { createErrorResponse, handleApiError, successResponse, withAuth } from "@/lib/api-utils";

const ALLOWED_ICONS = new Set(["star", "trophy", "medal", "target", "zap", "award"]);

function normalizeAchievementIcon(icon: string | null | undefined): string {
  const normalized = (icon || "").trim().toLowerCase();
  return ALLOWED_ICONS.has(normalized) ? normalized : "award";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { id } = await params;

        if (authUser.userId !== id) {
          return createErrorResponse("Access denied", 403);
        }

        const userAchievements = await prisma.userAchievement.findMany({
          where: { userId: id },
          orderBy: { earnedAt: "desc" },
          take: 10,
          include: {
            achievement: {
              select: {
                key: true,
                title: true,
                description: true,
                icon: true,
                xpReward: true,
              },
            },
          },
        });

        const data = userAchievements.map((item: any) => ({
          id: item.id,
          title: item.achievement.title,
          description: item.achievement.description,
          icon: normalizeAchievementIcon(item.achievement.icon),
          xpReward: item.achievement.xpReward,
          unlockedAt: item.earnedAt.toISOString(),
          key: item.achievement.key,
        }));

        return successResponse(data);
      } catch (error) {
        logger.error("Error fetching user achievements:", error);
        return handleApiError(error);
      }
    });
  });
}

