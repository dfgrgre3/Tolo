import { NextRequest, NextResponse } from "next/server";
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const questChains = await gamificationService.getActiveQuestChains();
        return successResponse({ questChains });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
