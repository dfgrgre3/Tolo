import { NextRequest } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { 
  handleApiError, 
  successResponse, 
  badRequestResponse,
  withAuth 
} from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';
import { logger } from '@/lib/logger';

interface BookCreateRequest {
  title: string;
  author: string;
  description: string;
  subject?: string;
  subjectId?: string;
  coverUrl?: string;
  downloadUrl: string;
  tags?: string[] | string;
}

// GET all books
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const subjectId = searchParams.get('subjectId');
      const search = searchParams.get('search');

      const where: Prisma.BookWhereInput = {};
      
      if (subjectId) {
        where.subjectId = subjectId;
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
        ];
      }

      const books = await prisma.book.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy: [
          { createdAt: "desc" },
          { downloads: "desc" }
        ]
      });

      return successResponse(books);
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}

// POST create a new book
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const body = (await req.json()) as BookCreateRequest;
        const { title, author, description, subject, subjectId, coverUrl, downloadUrl, tags } = body;

        const finalSubjectId = subjectId || subject;

        if (!title || !author || !description || !finalSubjectId || !downloadUrl) {
          return badRequestResponse("جميع الحقول المطلوبة يجب ملؤها", ERROR_CODES.MISSING_PARAMETER);
        }

        const newBook = await prisma.book.create({
          data: {
            title,
            author,
            description,
            subjectId: finalSubjectId,
            coverUrl: coverUrl || null,
            downloadUrl,
            uploaderId: userId,
            tags: Array.isArray(tags) ? tags : (tags ? [tags] : [])
          }
        });

        // Send upload notification
        try {
          const { sendMultiChannelNotification } = await import('@/services/notification-sender');
          await sendMultiChannelNotification({
            userId,
            title: 'تم رفع الكتاب بنجاح',
            message: `لقد تم رفع كتاب "${title}" إلى المكتبة الرقمية.`,
            type: 'success',
            icon: '📚'
          });
        } catch (notificationError: unknown) {
          logger.error('Failed to send book upload notification:', notificationError);
        }

        return successResponse(newBook, undefined, 201);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
