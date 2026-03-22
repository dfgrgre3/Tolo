import { NextRequest } from "next/server";
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';

// GET all books
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const subjectParam = searchParams.get("subject") ?? searchParams.get("subjectId");

      const where = subjectParam ? { subjectId: subjectParam } : {};

      const books = await prisma.book.findMany({
        where,
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
    try {
      const { title, author, description, subject, subjectId, coverUrl, downloadUrl, tags } = await req.json();

      const finalSubjectId = subjectId || subject;

      if (!title || !author || !description || !finalSubjectId || !downloadUrl) {
        return badRequestResponse("Ã„Ì⁄ «·ÕﬁÊ· «·„ÿ·Ê»… ÌÃ» „·ƒÂ«", ERROR_CODES.MISSING_PARAMETER);
      }

      const newBook = await prisma.book.create({
        data: {
          title,
          author,
          description,
          subjectId: finalSubjectId,
          coverUrl,
          downloadUrl,
          tags: (Array.isArray(tags) ? tags : (tags ? [tags] : [])) as any // Suppressing TS error due to stale Prisma Client
        }
      });

      return successResponse(newBook, undefined, 201);
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}
