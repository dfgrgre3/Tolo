import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const duplicateSchema = z.object({
  courseId: z.string().min(1, "معرف الدورة مطلوب"),
  newName: z.string().optional(),
});

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك باستنساخ الدورات");
      }

      try {
        const body = await req.json();
        const validation = duplicateSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0]?.message || "بيانات غير صالحة");
        }

        const { courseId, newName } = validation.data;

        // Fetch the original course with all related data
        const original = await prisma.subject.findUnique({
          where: { id: courseId },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                subTopics: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        });

        if (!original) {
          return notFoundResponse("الدورة الأصلية غير موجودة");
        }

        // Generate unique name
        const baseName = newName || `${original.name} (نسخة)`;
        let uniqueName = baseName;
        let counter = 1;

        while (await prisma.subject.findUnique({ where: { name: uniqueName } })) {
          uniqueName = `${baseName} ${counter}`;
          counter++;
        }

        // Create the duplicated course
        const duplicated = await prisma.subject.create({
          data: {
            name: uniqueName,
            nameAr: original.nameAr ? `${original.nameAr} (نسخة)` : null,
            code: null, // Reset code to avoid unique constraint
            description: original.description,
            icon: original.icon,
            color: original.color,
            type: original.type,
            isActive: false, // Start as inactive
            isPublished: false, // Start as draft
            level: original.level,
            price: original.price,
            durationHours: original.durationHours,
            requirements: original.requirements,
            learningObjectives: original.learningObjectives,
            instructorName: original.instructorName,
            instructorId: original.instructorId,
            categoryId: original.categoryId,
            thumbnailUrl: original.thumbnailUrl,
            trailerUrl: original.trailerUrl,
            seoTitle: null,
            seoDescription: null,
            slug: null,
            // Reset counters
            enrolledCount: 0,
            rating: 0,
          },
        });

        // Duplicate topics and subtopics
        for (const topic of original.topics) {
          const newTopic = await prisma.topic.create({
            data: {
              subjectId: duplicated.id,
              title: topic.title,
              description: topic.description,
              order: topic.order,
            },
          });

          for (const subTopic of topic.subTopics) {
            await prisma.subTopic.create({
              data: {
                topicId: newTopic.id,
                title: subTopic.title,
                description: subTopic.description,
                content: subTopic.content,
                videoUrl: subTopic.videoUrl,
                order: subTopic.order,
                durationMinutes: (subTopic as any).durationMinutes || 0,
                isFree: subTopic.isFree,
                type: subTopic.type,
              },
            });
          }
        }

        // Fetch the complete duplicated course
        const result = await prisma.subject.findUnique({
          where: { id: duplicated.id },
          include: {
            _count: {
              select: {
                topics: true,
                enrollments: true,
              },
            },
          },
        });

        return successResponse(
          { course: result },
          `تم استنساخ الدورة بنجاح كـ "${uniqueName}"`,
          201
        );
      } catch (error) {
        logger.error("Error duplicating course", error);
        return handleApiError(error);
      }
    })
  );
}
