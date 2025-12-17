import { NextRequest, NextResponse } from "next/server";
import { trackInteraction } from "@/lib/ai/ml-recommendations";
import { verifyToken } from "@/lib/services/auth-service";
import { logger } from '@/lib/logger';

/**
 * POST /api/ai/recommendations/track
 * Track user interactions for ML learning
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const user = await verifyToken(token);

        if (!user || !user.userId) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { type, itemType, itemId, metadata } = body;

        // Validate required fields
        if (!type || !itemType || !itemId) {
            return NextResponse.json(
                { error: 'Missing required fields: type, itemType, itemId' },
                { status: 400 }
            );
        }

        // Validate interaction type
        const validTypes = ['view', 'click', 'complete', 'like', 'dislike', 'bookmark'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Invalid interaction type. Must be one of: ' + validTypes.join(', ') },
                { status: 400 }
            );
        }

        // Validate item type
        const validItemTypes = ['resource', 'course', 'exam', 'content', 'teacher'];
        if (!validItemTypes.includes(itemType)) {
            return NextResponse.json(
                { error: 'Invalid item type. Must be one of: ' + validItemTypes.join(', ') },
                { status: 400 }
            );
        }

        // Track the interaction
        await trackInteraction(user.userId, type, itemType, itemId, metadata);

        logger.debug(`Interaction tracked: ${type} on ${itemType}:${itemId} by user ${user.userId}`);

        return NextResponse.json({
            success: true,
            message: 'Interaction tracked successfully'
        });

    } catch (error) {
        logger.error('Error tracking interaction:', error);
        return NextResponse.json(
            { error: 'Failed to track interaction' },
            { status: 500 }
        );
    }
}