import { NextRequest, NextResponse } from "next/server";
import { getHybridRecommendations } from "@/lib/ai/ml-recommendations";
import { successResponse, handleApiError, opsWrapper } from "@/lib/api-utils";
import { logger } from '@/lib/logger';

/**
 * GET /api/ai/recommendations
 * Fetch personalized AI recommendations for the current user.
 * 
 * Note: This route is set to public in middleware to allow graceful handling
 * of stale sessions or guest users, but it still prefers authenticated context.
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId || userId === 'anonymous') {
        // Return 401 with a friendly JSON body instead of a raw middleware block
        return NextResponse.json(
          { 
            success: false, 
            error: "Authentication required for personalized recommendations",
            recommendations: [] 
          },
          { status: 401 }
        );
      }

      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '6');

      const recommendations = await getHybridRecommendations(userId, limit);

      return successResponse({
        success: true,
        recommendations,
        count: recommendations.length
      });
    } catch (error) {
      logger.error("Error fetching AI recommendations:", error);
      return handleApiError(error);
    }
  });
}
