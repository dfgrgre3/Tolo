import { NextRequest, NextResponse } from "next/server";
import { analyzeSentiment, getUserSentimentTrends } from "@/lib/ai/sentiment-analysis";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const userId = req.headers.get("x-user-id");
      if (!userId) {
        return NextResponse.json(
          { error: "غير مصرح" },
          { status: 401 }
        );
      }
      const { text, context } = await req.json();

      if (!text) {
        return NextResponse.json(
          { error: "النص مطلوب لتحليل المشاعر" },
          { status: 400 }
        );
      }

      const sentiment = await analyzeSentiment(text, userId, context || 'general');

      return NextResponse.json({
        success: true,
        sentiment
      });
    } catch (error) {
      logger.error("Error analyzing sentiment:", error);
      return NextResponse.json(
        { error: "فشل في تحليل المشاعر" },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const userId = req.headers.get("x-user-id");
      if (!userId) {
        return NextResponse.json(
          { error: "غير مصرح" },
          { status: 401 }
        );
      }
      const { searchParams } = new URL(req.url);
      const days = parseInt(searchParams.get('days') || '7');

      const trends = await getUserSentimentTrends(userId, days);

      return NextResponse.json({
        success: true,
        trends
      });
    } catch (error) {
      logger.error("Error fetching sentiment trends:", error);
      return NextResponse.json(
        { error: "فشل في جلب اتجاهات المشاعر" },
        { status: 500 }
      );
    }
  });
}

