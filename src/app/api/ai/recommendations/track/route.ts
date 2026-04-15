import { NextRequest, NextResponse } from "next/server";
import { trackInteraction } from "@/lib/ai/ml-recommendations";
import { successResponse, handleApiError, badRequestResponse, withAuth } from "@/lib/api-utils";
import { logger } from '@/lib/logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";

/**
 * POST /api/ai/recommendations/track
 * Track user interactions for ML learning.
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => 
    withAuth(req, async (user) => {
      try {
        const body = await req.json();
        const { type, itemType, itemId, metadata } = body;

        // Validate required fields
        if (!type || !itemType || !itemId) {
          return badRequestResponse('Missing required fields: type, itemType, itemId');
        }

        // Validate interaction type
        const validTypes = ['view', 'click', 'complete', 'like', 'dislike', 'bookmark'];
        if (!validTypes.includes(type)) {
          return badRequestResponse(`Invalid interaction type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate item type
        const validItemTypes = ['resource', 'course', 'exam', 'content', 'teacher'];
        if (!validItemTypes.includes(itemType)) {
          return badRequestResponse(`Invalid item type. Must be one of: ${validItemTypes.join(', ')}`);
        }

        // Track the interaction using identified user
        await trackInteraction(
          user.userId,
          type,
          itemType,
          itemId,
          metadata
        );

        logger.debug(`Interaction tracked: ${type} on ${itemType}:${itemId} by user ${user.userId}`);

        return successResponse({
          success: true,
          message: 'Interaction tracked successfully'
        });

      } catch (error) {
        logger.error('Error tracking interaction:', error);
        return handleApiError(error);
      }
    })
  );
}
