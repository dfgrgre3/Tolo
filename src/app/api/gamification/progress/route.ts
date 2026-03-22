import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const progress = await gamificationService.getUserProgress(authUser.userId);
        return successResponse(progress);
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
        const { action, data } = body;

        if (!action) {
          return badRequestResponse('Action is required');
        }

        const updatedProgress = await gamificationService.updateUserProgress(authUser.userId, action, data || {});
        return successResponse(updatedProgress, "تم تحديث التقدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}


