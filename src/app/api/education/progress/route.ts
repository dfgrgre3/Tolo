import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';
import { z } from "zod";

const progressSchema = z.object({
  subTopicId: z.string().min(1, "معرف الدرس مطلوب"),
  completed: z.boolean().default(true),
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

        const progress = await prisma.topicProgress.upsert({
          where: {
            userId_subTopicId: {
              userId: authUser.userId,
              subTopicId
            }
          },
          update: {
            completed,
            completedAt: completed ? new Date() : null
          },
          create: {
            userId: authUser.userId,
            subTopicId,
            completed,
            completedAt: completed ? new Date() : null
          }
        });

        // Potentially add XP if newly completed
        if (completed) {
            // Placeholder: Call gamification service to add XP
        }

        return successResponse(progress, "تم تحديث التقدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
