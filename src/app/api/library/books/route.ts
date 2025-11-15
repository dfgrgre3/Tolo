import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all books
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");

    const where = subject ? { subject } : {};

    const books = await (prisma as any).book.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { downloads: "desc" }
      ]
    });

    return NextResponse.json(books);
  } catch (error) {
    logger.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الكتب" },
      { status: 500 }
    );
    }
  });
}

// POST create a new book
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { title, author, description, subject, coverUrl, downloadUrl, tags } = await req.json();

    if (!title || !author || !description || !subject || !downloadUrl) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    const newBook = await (prisma as any).book.create({
      data: {
        title,
        author,
        description,
        subject,
        coverUrl,
        downloadUrl,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []) // Ensure tags is an array for JSON field
      }
    });

    return NextResponse.json(newBook, { status: 201 });
  } catch (error) {
    logger.error("Error creating book:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إضافة الكتاب" },
      { status: 500 }
    );
    }
  });
}
