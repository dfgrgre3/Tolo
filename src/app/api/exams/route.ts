import { NextRequest } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async () => {
      try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const cursor = searchParams.get('cursor');
        const subjectId = searchParams.get('subjectId');
        const year = searchParams.get('year');

        if (Number.isNaN(limit) || limit < 1 || limit > 100) {
          return badRequestResponse("الحد الأقصى هو 100");
        }

        if (!cursor && (Number.isNaN(offset) || offset < 0)) {
          return badRequestResponse("Invalid offset parameter");
        }

        const where: Prisma.ExamWhereInput = {};
        if (subjectId) where.subjectId = subjectId;
        if (year) where.year = parseInt(year, 10);

        const [fetchedExams, total] = await Promise.all([
          prisma.exam.findMany({
            where,
            orderBy: [{ year: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(cursor
              ? {
                  cursor: { id: cursor },
                  skip: 1,
                }
              : {
                  skip: offset,
                }),
            include: {
              subject: { select: { nameAr: true, name: true, color: true } },
              _count: { select: { results: true } }
            }
          }),
          prisma.exam.count({ where })
        ]);

        const hasMore = fetchedExams.length > limit;
        const exams = hasMore ? fetchedExams.slice(0, limit) : fetchedExams;

        return successResponse({
          exams,
          pagination: {
            total,
            limit,
            offset: cursor ? undefined : offset,
            hasMore,
            nextCursor: hasMore ? exams[exams.length - 1]?.id ?? null : null,
          }
        });
      } catch (error: unknown) {
        logger.error('Exams API Error:', error);
        return handleApiError(error);
      }
    });
  });
}

const logger = {
  error: (msg: string, err: any) => console.error(msg, err)
};
