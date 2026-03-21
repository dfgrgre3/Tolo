import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/books - Get all books
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
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
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الكتب" },
      { status: 500 }
    );
  }
}

// POST /api/admin/books - Create new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
        tags: tags || [],
      },
      include: {
        subject: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الكتاب" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/books - Delete book
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
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
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الكتاب" },
      { status: 500 }
    );
  }
}
