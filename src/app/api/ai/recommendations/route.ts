import { NextRequest, NextResponse } from "next/server";
import { getHybridRecommendations, trackInteraction } from "@/lib/ai/ml-recommendations";
import { verifyToken } from "@/lib/services/auth-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const decodedToken = await verifyToken(req);
      if (!decodedToken) {
        return NextResponse.json(
          { error: "غير مصرح" },
          { status: 401 }
        );
      }

      const userId = decodedToken.userId;
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '10');

      const recommendations = await getHybridRecommendations(userId, limit);

      return NextResponse.json({
        success: true,
        recommendations,
        count: recommendations.length
      });
    } catch (error) {
      logger.error("Error fetching recommendations:", error);
      return NextResponse.json(
        { error: "فشل في جلب التوصيات", recommendations: [] },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const decodedToken = await verifyToken(req);
      if (!decodedToken) {
        return NextResponse.json(
          { error: "غير مصرح" },
          { status: 401 }
        );
      }

      const userId = decodedToken.userId;
      const { type, itemType, itemId, metadata } = await req.json();

      if (!type || !itemType || !itemId) {
        return NextResponse.json(
          { error: "معاملات مطلوبة: type, itemType, itemId" },
          { status: 400 }
        );
      }

      await trackInteraction(
        userId,
        type,
        itemType,
        itemId,
        metadata
      );

      return NextResponse.json({
        success: true,
        message: "تم تسجيل التفاعل بنجاح"
      });
    } catch (error) {
      logger.error("Error tracking interaction:", error);
      return NextResponse.json(
        { error: "فشل في تسجيل التفاعل" },
        { status: 500 }
      );
    }
  });
}

