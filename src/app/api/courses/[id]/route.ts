import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSetEnhanced } from "@/lib/cache-service-enhanced";

// GET a specific subject by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Try to get from cache first
    const subject = await getOrSetEnhanced(
      `subject:${id}`,
      async () => {
        return await prisma.subject.findUnique({
          where: { id }
        });
      }
    );

    if (!subject) {
      return NextResponse.json(
        { error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    // Check enrollment if userId is provided
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    let enrollment = null;
    
    if (userId) {
      enrollment = await prisma.subjectEnrollment.findUnique({
        where: {
          userId_subject: {
            userId,
            subject: subject.name // Using subject name as the identifier
          }
        }
      });
    }

    return NextResponse.json({
      subject,
      enrollment
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

// DELETE a subject
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id }
    });

    if (!subject) {
      return NextResponse.json(
        { error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    // Delete the subject
    await prisma.subject.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: "تم حذف المادة بنجاح" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting subject:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

// PUT to update a subject
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await request.json();

    // Update the subject
    const updatedSubject = await prisma.subject.update({
      where: { id },
      data
    });

    return NextResponse.json(updatedSubject);
  } catch (error) {
    console.error("Error updating subject:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
