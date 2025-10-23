import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST to enroll in a subject
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId, subject } = await request.json();

    if (!userId || !subject) {
      return NextResponse.json(
        { error: "معرف المستخدم والمادة مطلوبان" },
        { status: 400 }
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

    // Check if already enrolled
    const existingEnrollment = await prisma.subjectEnrollment.findUnique({
      where: {
        userId_subject: {
          userId,
          subject
        }
      }
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "المستخدم مسجل بالفعل في هذه المادة" },
        { status: 400 }
      );
    }

    // Create enrollment
    const enrollment = await prisma.subjectEnrollment.create({
      data: {
        userId,
        subject,
        targetWeeklyHours: 0 // Default value, can be updated later
      }
    });

    return NextResponse.json(enrollment);
  } catch (error) {
    console.error("Error enrolling in course:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

// GET to check enrollment status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // This would be the subject
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.subjectEnrollment.findUnique({
      where: {
        userId_subject: {
          userId,
          subject: id
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { enrolled: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      enrolled: true,
      enrollment
    });
  } catch (error) {
    console.error("Error checking enrollment status:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

// DELETE to unenroll from a subject
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // This would be the subject
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    // Check if enrollment exists
    const enrollment = await prisma.subjectEnrollment.findUnique({
      where: {
        userId_subject: {
          userId,
          subject: id
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "التسجيل غير موجود" },
        { status: 404 }
      );
    }

    // Delete enrollment
    await prisma.subjectEnrollment.delete({
      where: {
        userId_subject: {
          userId,
          subject: id
        }
      }
    });

    return NextResponse.json(
      { message: "تم إلغاء التسجيل بنجاح" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unenrolling from course:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
