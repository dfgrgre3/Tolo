import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { withCache } from "@/lib/cache-middleware";
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { getOrSetEnhanced } from '@/lib/cache-service-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";


export async function GET(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withCache(request, handleGetRequest, 'subjects', 600); // Cache for 10 minutes
  });
}

async function handleGetRequest(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Validate userId parameter
    if (!userId || userId === 'undefined' || userId.trim() === '') {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Use enhanced caching for frequently accessed subjects
    const cacheKey = `subjects:${userId}`;
    const subjects = await getOrSetEnhanced(
      cacheKey,
      async () => {
        return await prisma.subjectEnrollment.findMany({
          where: { userId }
        });
      },
      600 // 10 minutes TTL
    );

    return NextResponse.json(subjects);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Enroll in a new subject
// POST - Enroll in a new subject
export async function POST(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    try {
      const userId = request.headers.get('x-user-id');

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const authUser = { userId };

      const { subject } = await request.json();

      if (!subject) {
        return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.subjectEnrollment.findFirst({
        where: {
          userId: authUser.userId,
          subjectId: subject
        }
      });

      if (existingEnrollment) {
        return NextResponse.json({ error: "Already enrolled in this subject" }, { status: 400 });
      }

      // Create enrollment
      const enrollment = await prisma.subjectEnrollment.create({
        data: {
          id: `${authUser.userId}_${subject}_${Date.now()}`,
          userId: authUser.userId,
          subjectId: subject
        }
      });

      // Invalidate user's subject cache
      await invalidateUserCache(authUser.userId);

      return NextResponse.json(enrollment, { status: 201 });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}