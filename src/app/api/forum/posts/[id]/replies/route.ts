import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all replies for a forum post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if post exists
    const post = await prisma.forumPost.findUnique({
      where: { id }
    });

    if (!post) {
      return NextResponse.json(
        { error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    const replies = await prisma.forumReply.findMany({
      where: { postId: id },
      include: {
        author: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    // Transform the data to match the frontend structure
    const transformedReplies = replies.map(reply => ({
      id: reply.id,
      content: reply.content,
      authorName: reply.author.name,
      createdAt: reply.createdAt.toISOString()
    }));

    return NextResponse.json(transformedReplies);
  } catch (error) {
    console.error("Error fetching forum replies:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الردود" },
      { status: 500 }
    );
  }
}

// POST create a new reply for a forum post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { userId, content } = await request.json();

    if (!userId || !content) {
      return NextResponse.json(
        { error: "المستخدم والمحتوى مطلوبان" },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.forumPost.findUnique({
      where: { id }
    });

    if (!post) {
      return NextResponse.json(
        { error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const newReply = await prisma.forumReply.create({
      data: {
        content,
        authorId: userId,
        postId: id
      },
      include: {
        author: {
          select: { name: true }
        }
      }
    });

    // Transform the data to match the frontend structure
    const transformedReply = {
      id: newReply.id,
      content: newReply.content,
      authorName: newReply.author.name,
      createdAt: newReply.createdAt.toISOString()
    };

    return NextResponse.json(transformedReply, { status: 201 });
  } catch (error) {
    console.error("Error creating forum reply:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إنشاء الرد" },
      { status: 500 }
    );
  }
}
