import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSetEnhanced } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET a specific subject by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

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
      const { searchParams } = new URL(req.url);
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
      logger.error("Error fetching subject:", error);
      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  });
}

// DELETE a subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

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
      logger.error("Error deleting subject:", error);
      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  });
}

// PUT to update a subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const data = await req.json();

      // Update the subject
      const updatedSubject = await prisma.subject.update({
        where: { id },
        data
      });

      return NextResponse.json(updatedSubject);
    } catch (error) {
      logger.error("Error updating subject:", error);
      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  });
}
