import { NextRequest, NextResponse } from "next/server";
import {
  generateSummary,
  generateFlashcards,
  generateStudyPlan,
  generatePracticeQuestions,
  getUserGeneratedContent
} from "@/lib/ai/content-generation";
import { verifyToken } from "@/lib/services/auth-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

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
      const { type, ...params } = await req.json();

      if (!type) {
        return NextResponse.json(
          { error: "نوع المحتوى مطلوب (summary, flashcard, study_plan, practice_question)" },
          { status: 400 }
        );
      }

      let result;

      switch (type) {
        case 'summary':
          if (!params.text) {
            return NextResponse.json(
              { error: "النص مطلوب لإنشاء الملخص" },
              { status: 400 }
            );
          }
          result = await generateSummary(
            params.text,
            userId,
            params.subject,
            params.maxLength
          );
          break;

        case 'flashcard':
          if (!params.text) {
            return NextResponse.json(
              { error: "النص مطلوب لإنشاء البطاقات التعليمية" },
              { status: 400 }
            );
          }
          result = await generateFlashcards(
            params.text,
            userId,
            params.subject,
            params.count || 10
          );
          break;

        case 'study_plan':
          if (!params.subjects || !Array.isArray(params.subjects)) {
            return NextResponse.json(
              { error: "قائمة المواد مطلوبة" },
              { status: 400 }
            );
          }
          result = await generateStudyPlan(
            userId,
            params.subjects,
            params.duration || 7,
            params.hoursPerDay || 2
          );
          break;

        case 'practice_question':
          if (!params.topic) {
            return NextResponse.json(
              { error: "الموضوع مطلوب لإنشاء الأسئلة" },
              { status: 400 }
            );
          }
          result = await generatePracticeQuestions(
            params.topic,
            userId,
            params.subject,
            params.count || 5,
            params.difficulty || 'medium'
          );
          break;

        default:
          return NextResponse.json(
            { error: "نوع محتوى غير صالح" },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        content: result
      });
    } catch (error) {
      logger.error("Error generating content:", error);
      return NextResponse.json(
        { error: "فشل في إنشاء المحتوى" },
        { status: 500 }
      );
    }
  });
}

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
      const type = searchParams.get('type') as any;
      const limit = parseInt(searchParams.get('limit') || '20');

      const content = await getUserGeneratedContent(userId, type, limit);

      return NextResponse.json({
        success: true,
        content,
        count: content.length
      });
    } catch (error) {
      logger.error("Error fetching content:", error);
      return NextResponse.json(
        { error: "فشل في جلب المحتوى", content: [] },
        { status: 500 }
      );
    }
  });
}

