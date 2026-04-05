import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول");
      }

      try {
        const { id } = await params;
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const skip = (page - 1) * limit;

        const course = await prisma.subject.findUnique({
          where: { id },
          select: { id: true, name: true },
        });

        if (!course) {
          return notFoundResponse("الدورة غير موجودة");
        }

        const [reviews, total, avgResult] = await Promise.all([
          prisma.subjectReview.findMany({
            where: { subjectId: id },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          }),
          prisma.subjectReview.count({ where: { subjectId: id } }),
          prisma.subjectReview.aggregate({
            where: { subjectId: id },
            _avg: { rating: true },
          }),
        ]);

        // Calculate rating distribution
        const distribution = await prisma.subjectReview.groupBy({
          by: ["rating"],
          where: { subjectId: id },
          _count: { rating: true },
        });

        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        distribution.forEach((d: { rating: number; _count: { rating: number } }) => {
          ratingDistribution[d.rating] = d._count.rating;
        });

        return successResponse({
          reviews: reviews.map((r: any) => ({
            id: r.id,
            userId: r.userId,
            userName: r.user.name || "مستخدم",
            userEmail: r.user.email,
            userAvatar: r.user.avatar,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
          })),
          averageRating: avgResult._avg.rating || 0,
          ratingDistribution,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        logger.error("Error fetching course reviews", error);
        return handleApiError(error);
      }
    })
  );
}
