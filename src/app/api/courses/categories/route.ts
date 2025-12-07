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
      { id: "MATH", name: "ط§ظ„ط±ظٹط§ط¶ظٹط§طھ", icon: "ًں”¢" },
      { id: "PHYSICS", name: "ط§ظ„ظپظٹط²ظٹط§ط،", icon: "âڑ›ï¸ڈ" },
      { id: "CHEMISTRY", name: "ط§ظ„ظƒظٹظ…ظٹط§ط،", icon: "ًں§ھ" },
      { id: "BIOLOGY", name: "ط§ظ„ط£ط­ظٹط§ط،", icon: "ًں§¬" },
      { id: "ARABIC", name: "ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©", icon: "ًں“‌" },
      { id: "ENGLISH", name: "ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©", icon: "ًں”¤" },
      { id: "HISTORY", name: "ط§ظ„طھط§ط±ظٹط®", icon: "ًںڈ›ï¸ڈ" },
      { id: "GEOGRAPHY", name: "ط§ظ„ط¬ط؛ط±ط§ظپظٹط§", icon: "ًںŒچ" },
      { id: "PHILOSOPHY", name: "ط§ظ„ظپظ„ط³ظپط©", icon: "ًں¤”" },
      { id: "RELIGION", name: "ط§ظ„طھط±ط¨ظٹط© ط§ظ„ط¯ظٹظ†ظٹط©", icon: "ًں•Œ" },
      { id: "COMPUTER_SCIENCE", name: "ط¹ظ„ظˆظ… ط§ظ„ط­ط§ط³ط¨", icon: "ًں’»" },
      { id: "PROGRAMMING", name: "ط§ظ„ط¨ط±ظ…ط¬ط©", icon: "ًں‘¨â€چًں’»" },
    ];

    return NextResponse.json(categories);
  } catch (error) {
    logger.error("Error fetching course categories:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„طھطµظ†ظٹظپط§طھ" },
      { status: 500 }
    );
    }
  });
}
