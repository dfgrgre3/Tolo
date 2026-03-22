import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, opsWrapper, handleApiError } from "@/lib/api-utils";

// GET /api/admin/books - Get all books
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAdmin(req, async () => {
      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const subjectId = searchParams.get("subjectId");

        const skip = (page - 1) * limit;

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

        const [books, total] = await Promise.all([
          prisma.book.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
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

        return NextResponse.json({
          books,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
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
            { error: "العنوان والمؤلف والمادة مطلوبون" },
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
            { error: "معرف الكتاب مطلوب" },
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
