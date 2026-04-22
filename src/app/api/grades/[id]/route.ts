import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function DELETE(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: "معرف الدرجة مطلوب" },
          { status: 400 }
        );
      }

      // حذف الدرجة
      await prisma.userGrade.delete({
        where: { id }
      });

      return NextResponse.json({
        success: true,
        message: "تم حذف الدرجة بنجاح"
      });
    } catch (error) {
      logger.error("Error deleting grade:", error);
      return NextResponse.json(
        { error: "حدث خطأ في حذف الدرجة" },
        { status: 500 }
      );
    }
  });
}