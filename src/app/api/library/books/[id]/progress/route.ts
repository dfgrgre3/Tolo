import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { 
  handleApiError, 
  successResponse, 
  badRequestResponse,
  withAuth 
} from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const bookId = params.id;

        const progress = await prisma.bookProgress.findUnique({
          where: {
            userId_bookId: {
              bookId,
              userId
            }
          }
        });

        if (!progress) {
          // Return default progress if none exists
          return successResponse({
            progress: 0,
            currentPage: 0,
            isCompleted: false,
          });
        }

        return successResponse(progress);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const bookId = params.id;
        const { progress, currentPage, totalPages, isCompleted } = await req.json();

        // Update or create progress
        const updatedProgress = await prisma.bookProgress.upsert({
          where: {
            userId_bookId: {
              bookId,
              userId
            }
          },
          update: {
            progress: progress !== undefined ? progress : 0,
            currentPage: currentPage !== undefined ? currentPage : 0,
            totalPages: totalPages !== undefined ? totalPages : undefined,
            isCompleted: isCompleted !== undefined ? isCompleted : false,
            lastReadAt: new Date()
          },
          create: {
            userId,
            bookId,
            progress: progress !== undefined ? progress : 0,
            currentPage: currentPage !== undefined ? currentPage : 0,
            totalPages: totalPages !== undefined ? totalPages : undefined,
            isCompleted: isCompleted !== undefined ? isCompleted : false,
            lastReadAt: new Date()
          }
        });

        return successResponse(updatedProgress, "تم حفظ تقدم القراءة");
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
