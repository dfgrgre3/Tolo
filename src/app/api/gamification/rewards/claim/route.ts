import { NextRequest } from "next/server";
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';
import { z } from "zod";

const claimSchema = z.object({
  rewardId: z.string().min(1, "معرف المكافأة مطلوب")
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = await req.json();
        const validation = claimSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { rewardId } = validation.data;
        await gamificationService.claimReward(authUser.userId, rewardId);

        return successResponse({ success: true }, "تم الحصول على المكافأة بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}