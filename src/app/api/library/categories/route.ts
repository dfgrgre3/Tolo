import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all library categories
export async function GET() {
  try {
    // Define categories for the library
    const categories = [
      { id: "MATH", name: "الرياضيات", icon: "🔢" },
      { id: "PHYSICS", name: "الفيزياء", icon: "⚛️" },
      { id: "CHEMISTRY", name: "الكيمياء", icon: "🧪" },
      { id: "BIOLOGY", name: "الأحياء", icon: "🧬" },
      { id: "ARABIC", name: "اللغة العربية", icon: "📝" },
      { id: "ENGLISH", name: "اللغة الإنجليزية", icon: "🔤" },
      { id: "HISTORY", name: "التاريخ", icon: "🏛️" },
      { id: "GEOGRAPHY", name: "الجغرافيا", icon: "🌍" },
      { id: "PHILOSOPHY", name: "الفلسفة", icon: "🤔" },
      { id: "RELIGION", name: "التربية الدينية", icon: "🕌" },
    ];

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching library categories:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب التصنيفات" },
      { status: 500 }
    );
  }
}
