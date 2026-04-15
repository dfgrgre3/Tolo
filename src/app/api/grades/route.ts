import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils';
import { z } from "zod";

const gradeSchema = z.object({
  subject: z.string().min(1, "ط§ط³ظ… ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨"),
  grade: z.number().min(0, "ط§ظ„ط¯ط±ط¬ط© ظ„ط§ ظٹظ…ظƒظ† ط£ظ† طھظƒظˆظ† ط£ظ‚ظ„ ظ…ظ† 0"),
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
          return forbiddenResponse("ظ„ط§ ظٹظ…ظƒظ†ظƒ ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ط¯ط±ط¬ط§طھ ظ…ط³طھط®ط¯ظ… ط¢ط®ط±");
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
        const subjectAverages = await (prisma.userGrade as any).groupBy({
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
          return notFoundResponse(`ط§ظ„ظ…ط§ط¯ط© ${subject} ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©`);
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

        return successResponse(newGrade, "طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط±ط¬ط© ط¨ظ†ط¬ط§ط­", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}



