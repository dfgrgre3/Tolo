import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';
import { z } from "zod";

const goalSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  targetValue: z.number().min(1),
  currentValue: z.number().default(0),
  unit: z.string().default("count"),
  category: z.string().default("custom"),
  xpReward: z.number().default(10),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status'); // 'active', 'completed', 'all'

        // Use authenticated user ID
        const progress = await gamificationService.getUserProgress(authUser.userId);

        let filteredGoals = progress.customGoals;

        // Filter by category if provided
        if (category && category !== 'all') {
          filteredGoals = filteredGoals.filter(goal => goal.category === category);
        }

        // Filter by status if provided
        if (status && status !== 'all') {
          if (status === 'active') {
            filteredGoals = filteredGoals.filter(goal => !goal.isCompleted);
          } else if (status === 'completed') {
            filteredGoals = filteredGoals.filter(goal => goal.isCompleted);
          }
        }

        return successResponse({
          goals: filteredGoals,
          summary: {
            total: progress.customGoals.length,
            active: progress.customGoals.filter(g => !g.isCompleted).length,
            completed: progress.customGoals.filter(g => g.isCompleted).length
          }
        });

      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = await req.json();
        const validation = goalSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const result = await gamificationService.createCustomGoal(authUser.userId, validation.data);
        return successResponse(result, "تم إنشاء الهدف بنجاح", 201);

      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

