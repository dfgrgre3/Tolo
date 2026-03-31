import { NextRequest, NextResponse } from "next/server";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError } from '@/lib/api-utils';
import { progressService } from "@/modules/progress/progress.service";

/**
 * --- EDUCATION SUMMARY API ---
 * 
 * Optimized endpoint for the student dashboard.
 * Delegates work to ProgressService with caching enabled.
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const summary = await progressService.getSummary(authUser.userId);
        return successResponse(summary);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
