import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";

const lessonSchema = z.object({
  teacherId: z.string().min(1, "معرف المعلم مطلوب"),
  title: z.string().min(1, "عنوان الدرس مطلوب"),
  location: z.string().min(1, "المكان مطلوب"),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  subjectId: z.string().min(1, "معرف المادة مطلوب"),
});

export async function GET(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        // If userId is provided in query, ensure it matches the authenticated user
        if (userId && userId !== authUser.userId) {
          return forbiddenResponse("لا يمكنك الوصول إلى دروس مستخدم آخر");
        }

        // Use authenticated user's ID if no userId provided in query
        const targetUserId = userId || authUser.userId;

        const lessons = await prisma.offlineLesson.findMany({
          where: { userId: targetUserId },
          include: { subject: true },
          orderBy: { startTime: "asc" }
        });

        return successResponse(lessons);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export async function POST(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const body = await request.json();
        const validation = lessonSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { teacherId, title, location, startTime, endTime, subjectId } = validation.data;

        const lesson = await prisma.offlineLesson.create({
          data: {
            userId: authUser.userId,
            teacherId,
            title,
            subjectId,
            location,
            startTime: new Date(startTime),
            endTime: new Date(endTime)
          },
        });

        return successResponse(lesson, "تم إنشاء الدرس بنجاح", 201);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}


