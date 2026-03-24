import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse, withAuth, notFoundResponse } from '@/lib/api-utils';

// GET all contests
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
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
        orderBy: {
          startDate: "asc"
        }
      });

      // Transform the data to match the frontend structure
      const transformedContests = contests.map((contest: any) => ({
        id: contest.id,
        title: contest.title,
        description: contest.description,
        imageUrl: contest.imageUrl,
        startDate: contest.startDate.toISOString(),
        endDate: contest.endDate.toISOString(),
        prize: contest.prizes,
        category: contest.category,
        organizerName: contest.organizer?.name || "نظام ثنوي",
        tags: contest.tags,
        questionsCount: contest._count?.questions || 0
      }));

      return successResponse(transformedContests);
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
        const {
          title,
          description,
          imageUrl,
          startDate,
          endDate,
          prize,
          category,
          tags
        } = await req.json();

        if (!title || !description || !startDate || !endDate) {
          return badRequestResponse("جميع الحقول المطلوبة يجب ملؤها");
        }

        const newContest = await prisma.contest.create({
          data: {
            title,
            description,
            imageUrl,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            prizes: prize,
            category,
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

        // Transform the data to match the frontend structure
        const transformedContest = {
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
