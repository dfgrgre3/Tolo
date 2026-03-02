import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all course categories
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
    // Define categories for the courses
    const categories = [
      { id: "MATH", name: "الرياضيات", icon: "ًں”¢" },
      { id: "PHYSICS", name: "الفيزياء", icon: "âڑ›ï¸ڈ" },
      { id: "CHEMISTRY", name: "الكيمياء", icon: "ًں§ھ" },
      { id: "BIOLOGY", name: "الأحياء", icon: "ًں§¬" },
      { id: "ARABIC", name: "اللغة العربية", icon: "ًں“‌" },
      { id: "ENGLISH", name: "اللغة الإنجليزية", icon: "ًں”¤" },
      { id: "HISTORY", name: "التاريخ", icon: "ًںڈ›ï¸ڈ" },
      { id: "GEOGRAPHY", name: "الجغرافيا", icon: "ًںŒچ" },
      { id: "PHILOSOPHY", name: "الفلسفة", icon: "ًں¤”" },
      { id: "RELIGION", name: "التربية الدينية", icon: "ًں•Œ" },
      { id: "COMPUTER_SCIENCE", name: "علوم الحاسب", icon: "ًں’»" },
      { id: "PROGRAMMING", name: "البرمجة", icon: "ًں‘¨â€چًں’»" },
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
