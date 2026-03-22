import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from "@/lib/api-utils";
import { createSubjectReview } from "@/lib/courses/advanced-course-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;
        const body = (await req.json()) as { rating: number; comment?: string };

        if (!body.rating || body.rating < 1 || body.rating > 5) {
          return badRequestResponse("التقييم يجب أن يكون بين 1 و 5");
        }

        const review = await createSubjectReview(id, userId, body.rating, body.comment);

        return successResponse(review);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

      const reviews = await prisma.subjectReview.findMany({
        where: { subjectId: id },
        include: {
          user: {
            select: {
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return successResponse(reviews);
    } catch (error) {
      return handleApiError(error);
    }
  });
}
