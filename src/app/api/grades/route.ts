import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils';
import { z } from "zod";

const gradeSchema = z.object({
  subject: z.string().min(1, "اسم المادة مطلوب"),
  grade: z.number().min(0, "الدرجة لا يمكن أن تكون أقل من 0"),
  maxGrade: z.number().default(100),
  date: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
  isOnline: z.boolean().default(false),
  teacherId: z.string().optional(),
  assignmentType: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // If userId is provided, it must match authenticated user
        if (userId && userId !== authUser.userId) {
          return forbiddenResponse("لا يمكنك الوصول إلى درجات مستخدم آخر");
        }

        const targetUserId = authUser.userId;

        // Fetch all grades for user
        const userGrades = await prisma.userGrade.findMany({
          where: { userId: targetUserId },
          include: {
            subject: {
              select: { nameAr: true, name: true }
            }
          },
          orderBy: {
            date: 'desc'
          }
        });

        // Calculate average per subject
        const subjectAverages = await prisma.userGrade.groupBy({
          by: ['subjectId'],
          where: { userId: targetUserId },
          _avg: {
            grade: true
          }
        });

        return successResponse({
          grades: userGrades,
          averages: subjectAverages
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
        const validation = gradeSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { subject, grade, maxGrade, date, assignmentType } = validation.data;

        // Search for subject
        const dbSubject = await prisma.subject.findFirst({
          where: {
            OR: [
              { name: { equals: subject, mode: 'insensitive' } },
              { nameAr: { equals: subject, mode: 'insensitive' } }
            ]
          }
        });

        if (!dbSubject) {
          return notFoundResponse(`المادة ${subject} غير موجودة`);
        }

        // Create grade
        const newGrade = await prisma.userGrade.create({
          data: {
            userId: authUser.userId,
            subjectId: dbSubject.id,
            grade: Number(grade),
            maxGrade: Number(maxGrade),
            date: date ? new Date(date) : new Date(),
            examName: assignmentType
          }
        });

        return successResponse(newGrade, "تم تسجيل الدرجة بنجاح", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

