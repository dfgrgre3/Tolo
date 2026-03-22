import { NextRequest } from "next/server";
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const subjectId = searchParams.get('subjectId');
        const year = searchParams.get('year');

        if (limit > 100) {
          return badRequestResponse("الحد الأقصى هو 100");
        }

        const where: any = {};
        if (subjectId) where.subjectId = subjectId;
        if (year) where.year = parseInt(year);

        const [exams, total] = await Promise.all([
          prisma.exam.findMany({
            where,
            orderBy: [{ year: "desc" }, { createdAt: "desc" }],
            take: limit,
            skip: offset,
            include: {
              subject: { select: { nameAr: true, name: true, color: true } },
              _count: { select: { results: true } }
            }
          }),
          prisma.exam.count({ where })
        ]);

        return successResponse({
          exams,
          pagination: {
            total,
            limit,
            offset,
            hasMore: total > offset + exams.length
          }
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}