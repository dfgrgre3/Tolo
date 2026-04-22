import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  handleApiError,
  successResponse,
  badRequestResponse,
  withAuth } from
'@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';

export async function GET(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { id: bookId } = await params;

      const reviews = await prisma.bookReview.findMany({
        where: { bookId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return successResponse(reviews);
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}

export async function POST(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    return withAuth(request, async ({ userId }) => {
      try {
        const { id: bookId } = await params;
        const { rating, comment } = await request.json();

        if (!rating || rating < 1 || rating > 5) {
          return badRequestResponse("التقييم يجب أن يكون بين 1 و 5", ERROR_CODES.INVALID_PARAMETER);
        }

        const review = await prisma.bookReview.upsert({
          where: {
            bookId_userId: {
              bookId,
              userId
            }
          },
          update: {
            rating,
            comment,
            updatedAt: new Date()
          },
          create: {
            bookId,
            userId,
            rating,
            comment
          }
        });

        // Recalculate book average rating
        const allReviews = await prisma.bookReview.findMany({
          where: { bookId },
          select: { rating: true }
        });

        const avgRating = allReviews.reduce((sum: number, rev: {rating: number;}) => sum + rev.rating, 0) / (allReviews.length || 1);

        await prisma.book.update({
          where: { id: bookId },
          data: { rating: avgRating }
        });

        return successResponse(review, "تمت إضافة مراجعتك بنجاح");
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
