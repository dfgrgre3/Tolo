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
        orderBy: {
          startDate: "asc"
        }
      });

      // Transform the data to match the frontend structure
      const transformedContests = contests.map((contest) => ({
        id: contest.id,
        title: contest.title,
        description: contest.description,
        // imageUrl: contest.imageUrl, // Not in schema
        startDate: contest.startDate.toISOString(),
        endDate: contest.endDate.toISOString(),
        prize: contest.prizes, // Schema has prizes (Json)
        // category: contest.category, // Not in schema
        // organizerName: contest.organizer?.name, // Not in schema
        // tags: contest.tags, // Not in schema
        // participantsCount: contest._count?.participants // Not in schema
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

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return notFoundResponse("المستخدم غير موجود");
        }

        const newContest = await prisma.contest.create({
          data: {
            title,
            description,
            // imageUrl, // Not in schema
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            prizes: prize ? JSON.stringify(prize) : undefined, // Schema has prizes
            // category, // Not in schema
            // organizerId: userId, // Not in schema
            // tags: tags || [] // Not in schema
          }
        });

        // Transform the data to match the frontend structure
        const transformedContest = {
          id: newContest.id,
          title: newContest.title,
          description: newContest.description,
          // imageUrl: newContest.imageUrl,
          startDate: newContest.startDate.toISOString(),
          endDate: newContest.endDate.toISOString(),
          prize: newContest.prizes,
          // category: newContest.category,
          // organizerName: user.name,
          // tags: newContest.tags,
          // participantsCount: 0
        };

        return successResponse(transformedContest, undefined, 201);
      } catch (error: unknown) {
        logger.error("Error creating contest:", error);
        return handleApiError(error);
      }
    });
  });
}
