import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse, withAuth } from '@/lib/api-utils';

interface ContestResponse {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  prize: string | null;
  category: string | null;
  organizerName: string;
  tags: string[];
  questionsCount: number;
}

interface ContestCreateRequest {
  title: string;
  description: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  prize?: string;
  category?: string;
  tags?: string[];
}

// GET all contests
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const cursor = searchParams.get('cursor');

      if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return badRequestResponse("Invalid limit parameter");
      }

      const contests = await prisma.contest.findMany({
        include: {
          organizer: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              questions: true
            }
          }
        },
        orderBy: [
          {
            startDate: "asc"
          },
          {
            id: "desc"
          }
        ],
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      });

      const hasMore = contests.length > limit;
      const pageContests = hasMore ? contests.slice(0, limit) : contests;

      const transformedContests = pageContests.map((contest: any): ContestResponse => ({
        id: contest.id,
        title: contest.title,
        description: contest.description,
        imageUrl: contest.imageUrl,
        startDate: contest.startDate.toISOString(),
        endDate: contest.endDate.toISOString(),
        prize: contest.prizes,
        category: contest.category,
        organizerName: contest.organizer?.name || "نظام ثناوي",
        tags: contest.tags,
        questionsCount: contest._count?.questions || 0
      }));

      return successResponse({
        contests: transformedContests,
        hasMore,
        nextCursor: hasMore ? transformedContests[transformedContests.length - 1]?.id ?? null : null,
      });
    } catch (error: unknown) {
      logger.error("Error fetching contests:", error);
      return handleApiError(error);
    }
  });
}

// POST create a new contest
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const body = (await req.json()) as ContestCreateRequest;
        const {
          title,
          description,
          imageUrl,
          startDate,
          endDate,
          prize,
          category,
          tags
        } = body;

        if (!title || !description || !startDate || !endDate) {
          return badRequestResponse("جميع الحقول المطلوبة يجب ملؤها");
        }

        const newContest = await prisma.contest.create({
          data: {
            title,
            description,
            imageUrl: imageUrl || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            prizes: prize || null,
            category: category || null,
            tags: Array.isArray(tags) ? tags : [],
            organizerId: userId
          },
          include: {
            organizer: {
              select: {
                name: true
              }
            }
          }
        });

        const transformedContest: ContestResponse = {
          id: newContest.id,
          title: newContest.title,
          description: newContest.description,
          imageUrl: newContest.imageUrl,
          startDate: newContest.startDate.toISOString(),
          endDate: newContest.endDate.toISOString(),
          prize: newContest.prizes,
          category: newContest.category,
          organizerName: newContest.organizer?.name || "أنت",
          tags: newContest.tags,
          questionsCount: 0
        };

        return successResponse(transformedContest, undefined, 201);
      } catch (error: unknown) {
        logger.error("Error creating contest:", error);
        return handleApiError(error);
      }
    });
  });
}
