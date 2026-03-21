import { NextRequest, NextResponse } from "next/server";
import { gamificationService } from "@/lib/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';
import { z } from "zod";

const progressSchema = z.object({
  questId: z.string().min(1, "معرف المهمة مطلوب"),
  progress: z.number().min(0).max(100),
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

        const { questId, progress } = validation.data;
        const result = await gamificationService.updateQuestProgress(authUser.userId, questId, progress);

        return successResponse(result, "تم تحديث التقدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
