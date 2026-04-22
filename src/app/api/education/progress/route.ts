import { NextRequest } from "next/server";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';
import { progressService } from "@/modules/progress/progress.service";
import { z } from "zod";

/**
 * --- PROGRESS API ENDPOINT ---
 * 
 * Modular route that delegates all logic to modular services for maintainability
 * and high performance under load.
 */

const progressSchema = z.object({
  subTopicId: z.string().min(1, "معرف الدرس مطلوب"),
  completed: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = await req.json();
        const validation = progressSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { subTopicId, completed } = validation.data;

        /**
         * Delegate to ProgressService (modular approach)
         * This will automatically handle: DB Upsert, XP awards (async), Cache Invalidation, and Realtime emission (SSE).
         */
        const result = await progressService.updateProgress({
          userId: authUser.userId,
          subTopicId,
          completed
        });

        return successResponse(result.data, "تم تحديث التقدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}