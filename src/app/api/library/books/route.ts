import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all books
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");

    const where = subject ? { subject } : {};

    const books = await prisma.book.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { downloads: "desc" }
      ]
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الكتب" },
      { status: 500 }
    );
  }
}

// POST create a new book
export async function POST(request: NextRequest) {
  try {
    const { title, author, description, subject, coverUrl, downloadUrl, tags } = await request.json();

    if (!title || !author || !description || !subject || !downloadUrl) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    const newBook = await prisma.book.create({
      data: {
        title,
        author,
        description,
        subject,
        coverUrl,
        downloadUrl,
        tags: tags || []
      }
    });

    return NextResponse.json(newBook, { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إضافة الكتاب" },
      { status: 500 }
    );
  }
}
