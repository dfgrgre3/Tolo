import { NextRequest } from 'next/server';
import { gamificationService } from '@/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { searchParams } = new URL(req.url);
        const type = (searchParams.get('type') || 'global') as 'global' | 'subject' | 'season';
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const seasonId = searchParams.get('seasonId') || undefined;
        const subjectId = searchParams.get('subjectId') || undefined;

        if (limit > 100) {
          return badRequestResponse('Limit cannot exceed 100');
        }

        // Get leaderboard data
        const leaderboard = await gamificationService.getLeaderboard(type, limit, {
          seasonId,
          subjectId
        });

        // Find current user position if they are in the leaderboard
        const userPosition = leaderboard.find(entry => entry.userId === authUser.userId);

        return successResponse({
          leaderboard,
          userPosition: userPosition ? {
            rank: userPosition.rank,
            totalXP: userPosition.totalXP,
            level: userPosition.level
          } : null,
          type,
          totalEntries: leaderboard.length,
          lastUpdated: new Date().toISOString()
        });

      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
