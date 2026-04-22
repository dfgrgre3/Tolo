import { NextRequest } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  handleApiError,
  successResponse,
  badRequestResponse,
  withAuth } from
'@/lib/api-utils';
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

      const { searchService } = await import('@/services/search-service');

      // 1. Offload search to specialized engine (Elasticsearch)
      // Optimized for 10M+ users with O(1) retrieval and relevance ranking
      if (search) {
        const elasticResults = await searchService.searchBooks(search, 50);

        if (elasticResults && elasticResults.length > 0) {
          const bookIds = elasticResults.map((r: any) => r.id);

          // Fetch full records from DB with pre-sorted order from Elastic
          const books = await prisma.book.findMany({
            where: { id: { in: bookIds } },
            include: {
              uploader: { select: { id: true, name: true, username: true, avatar: true } },
              _count: { select: { reviews: true } }
            }
          });

          // Return formatted results with relevance sorting preserved
          const sortedBooks = bookIds.map((id) => books.find((b: any) => b.id === id)).filter(Boolean);
          return successResponse(sortedBooks);
        }
      }

      const where: Prisma.BookWhereInput = {};

      if (subjectId) {
        where.subjectId = subjectId;
      }

      if (search && !process.env.ELASTICSEARCH_ENABLED) {
        // Fallback for local/non-elastic environments
        where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } }];

      }

      const books = await prisma.book.findMany({
        where,
        include: {
          uploader: { select: { id: true, name: true, username: true, avatar: true } },
          _count: { select: { reviews: true } }
        },
        orderBy: [
        { createdAt: "desc" },
        { downloads: "desc" }],

        take: 100 // Hard-limit per request for 10M-user safety
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
            tags: Array.isArray(tags) ? tags : tags ? [tags] : []
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
            icon: 'ًں“ڑ'
          });
        } catch (notificationError: unknown) {
          logger.error('Failed to send book upload notification:', notificationError);
        }

        // Index in search engine (Background)
        try {
          const { searchService } = await import('@/services/search-service');
          searchService.indexBook(newBook).catch((e) => logger.error('Async Indexing failed for book', e));
        } catch (_searchError) {
          logger.warn('Search service unavailable for indexing');
        }

        return successResponse(newBook, undefined, 201);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}