import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET /api/analytics/predictions
 * Get AI-powered progress predictions based on real user data
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId') || req.headers.get('x-user-id');
    
      if (!userId) {
        return NextResponse.json(
          { error: 'userId required', success: false },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
          totalXP: true,
          level: true,
          totalStudyTime: true,
          tasksCompleted: true,
          currentStreak: true,
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Base prediction on real user data
      const xpPerTask = user.tasksCompleted > 0 ? user.totalXP / user.tasksCompleted : 50;
      const confidence = Math.min(95, 60 + (user.currentStreak * 2));

      const predictions = [
        {
          period: "الأسبوع القادم",
          predictedScore: Math.min(100, 70 + (user.level * 2)),
          confidence,
          milestones: [
            { date: new Date(Date.now() + 7 * 86400000).toISOString(), goal: `الوصول إلى مستوى ${user.level + 1}`, status: "upcoming" },
            { date: new Date(Date.now() + 3 * 86400000).toISOString(), goal: "إكمال 5 مهام جديدة", status: "upcoming" },
          ],
          recommendations: user.totalStudyTime < 100 
            ? ["تحتاج إلى زيادة وقت المذاكرة اليومي بمقدار 15 دقيقة", "ابدأ بمهام صغيرة لزيادة الزخم"]
            : ["استمر في هذا الأداء الرائع!", "حاول تنويع المواد الدراسية لتجنب الملل"]
        }
      ];

      return NextResponse.json({
        success: true,
        predictions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error generating predictions:', error);
      return handleApiError(error);
    }
  });
}
