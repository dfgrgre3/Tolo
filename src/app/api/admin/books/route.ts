import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, handleApiError } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

// GET /api/admin/books - Get all books
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAdmin(req, async () => {
      try {
        const searchParams = req.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);
        const cursor = searchParams.get("cursor");
        const search = searchParams.get("search") || "";
        const subjectId = searchParams.get("subjectId");

        if (Number.isNaN(limit) || limit < 1 || limit > 100) {
          return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
        }

        if (!cursor && (Number.isNaN(offset) || offset < 0)) {
          return NextResponse.json({ error: "Invalid offset parameter" }, { status: 400 });
        }

        const where = {
          AND: [
            search
              ? {
                  OR: [
                    { title: { contains: search, mode: "insensitive" as const } },
                    { author: { contains: search, mode: "insensitive" as const } },
                  ],
                }
              : {},
            subjectId ? { subjectId } : {},
          ],
        };

        const [fetchedBooks, total] = await Promise.all([
          prisma.book.findMany({
            where,
            ...(cursor
              ? {
                  cursor: { id: cursor },
                  skip: 1,
                }
              : {
                  skip: offset,
                }),
            take: limit + 1,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: {
              subject: {
                select: { id: true, name: true, nameAr: true },
              },
              uploader: {
                select: { id: true, name: true, username: true, avatar: true },
              },
            },
          }),
          prisma.book.count({ where }),
        ]);

        const hasMore = fetchedBooks.length > limit;
        const books = hasMore ? fetchedBooks.slice(0, limit) : fetchedBooks;

        return NextResponse.json({
          books,
          pagination: {
            limit,
            total,
            offset: cursor ? undefined : offset,
            hasMore,
            nextCursor: hasMore ? books[books.length - 1]?.id ?? null : null,
          },
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// POST /api/admin/books - Create new book
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAdmin(req, async ({ userId }) => {
      try {
        const body = await req.json();
        const { title, author, description, subjectId, coverUrl, downloadUrl, tags } = body;

        if (!title || !author || !subjectId) {
          return NextResponse.json(
            { error: "ط§ظ„ط¹ظ†ظˆط§ظ† ظˆط§ظ„ظ…ط¤ظ„ظپ ظˆط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨ظˆظ†" },
            { status: 400 }
          );
        }

        const book = await prisma.book.create({
          data: {
            title,
            author,
            description,
            subjectId,
            coverUrl,
            downloadUrl,
            uploaderId: body.uploaderId || userId,
            tags: tags || [],
          },
          include: {
            subject: {
              select: { id: true, name: true },
            },
            uploader: {
              select: { id: true, name: true, username: true },
            },
          },
        });

        return NextResponse.json(book);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// DELETE /api/admin/books - Delete book
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return NextResponse.json(
            { error: "ظ…ط¹ط±ظپ ط§ظ„ظƒطھط§ط¨ ظ…ط·ظ„ظˆط¨" },
            { status: 400 }
          );
        }

        await prisma.book.delete({
          where: { id },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
