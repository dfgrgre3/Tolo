import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    console.error("Error deleting grade:", error);
    return NextResponse.json(
      { error: "حدث خطأ في حذف الدرجة" },
      { status: 500 }
    );
  }
}
