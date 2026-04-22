import { NextRequest, NextResponse } from "next/server";

import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all library categories
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      // Define categories for the library
      const categories = [
      { id: "MATH", name: "الرياضيات  ", icon: "ًںâ€‌آ¢" },
      { id: "PHYSICS", name: "الفيزياء", icon: "أ¢ڑâ€؛أ¯آ¸ڈ" },
      { id: "CHEMISTRY", name: "الكيمياء", icon: "ًںآ§ھ" },
      { id: "BIOLOGY", name: "الاحياء", icon: "ًںآ§آ¬" },
      { id: "ARABIC", name: "اللغة العربية", icon: "ًںâ€œâ€Œ" },
      { id: "ENGLISH", name: "اللغة الإنجليزية", icon: "ًںâ€‌آ¤" },
      { id: "HISTORY", name: "التاريخ", icon: "ًںڈâ€؛أ¯آ¸ڈ" },
      { id: "GEOGRAPHY", name: "الجغرافيا", icon: "ًںإ’چ" },
      { id: "PHILOSOPHY", name: "الفلسفة", icon: "ًںآ¤â€‌" },
      { id: "RELIGION", name: "التربية الدينية", icon: "ًںâ€¢إ’" }];


      return NextResponse.json(categories);
    } catch (error) {
      logger.error("Error fetching library categories:", error);
      return NextResponse.json(
        { error: "حدث خطأ في جلب التصنيفات" },
        { status: 500 }
      );
    }
  });
}