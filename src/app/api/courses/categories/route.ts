import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all course categories
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
    // Define categories for the courses
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
      { id: "COMPUTER_SCIENCE", name: "علوم الحاسب", icon: "💻" },
      { id: "PROGRAMMING", name: "البرمجة", icon: "👨‍💻" },
    ];

    return NextResponse.json(categories);
  } catch (error) {
    logger.error("Error fetching course categories:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب التصنيفات" },
      { status: 500 }
    );
    }
  });
}
