import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from "@/lib/api-utils";
import { handleReviewSubmission } from "@/lib/courses/course-integration-service";

export async function POST(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    return withAuth(request, async ({ userId }) => {
      try {
        const { id } = await params;
        const body = (await request.json()) as {rating: number;comment?: string;};

        if (!body.rating || body.rating < 1 || body.rating > 5) {
          return badRequestResponse("التقييم يجب أن يكون بين 1 و 5");
        }

        // Check enrollment before allowing review
        const enrollment = await prisma.subjectEnrollment.findUnique({
          where: { userId_subjectId: { userId, subjectId: id } }
        });

        if (!enrollment) {
          return badRequestResponse("يجب أن تكون مسجلاً في الدورة لتقديم تقييم");
        }

        // Submit review with XP integration
        const result = await handleReviewSubmission(id, userId, body.rating, body.comment);

        return successResponse({
          success: result.success,
          xpAwarded: result.xpAwarded
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function GET(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { id } = await params;

      const reviews = await prisma.subjectReview.findMany({
        where: { subjectId: id },
        include: {
          user: {
            select: {
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      });

      // Calculate review stats
      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0 ?
      (reviews as any[]).reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews :
      0;


      const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
      for (const r of reviews) {
        if (r.rating >= 1 && r.rating <= 5) {
          distribution[r.rating - 1]++;
        }
      }

      return successResponse({
        reviews,
        stats: {
          totalReviews,
          avgRating: parseFloat(avgRating.toFixed(1)),
          distribution: {
            1: distribution[0],
            2: distribution[1],
            3: distribution[2],
            4: distribution[3],
            5: distribution[4]
          }
        }
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
