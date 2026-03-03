import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { withCache } from "@/lib/cache-middleware";
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { getOrSetEnhanced } from '@/lib/cache-service-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, badRequestResponse, unauthorizedResponse, withAuth, handleApiError } from '@/lib/api-utils';


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
      return badRequestResponse("userId required");
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

    return successResponse(subjects);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}

// POST - Enroll in a new subject
export async function POST(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {

        const { subject } = await request.json();

        if (!subject) {
          return badRequestResponse("Subject ID required");
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.subjectEnrollment.findFirst({
          where: {
            userId: authUser.userId,
            subjectId: subject
          }
        });

        if (existingEnrollment) {
          return badRequestResponse("Already enrolled in this subject");
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

        return successResponse(enrollment, undefined, 201);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}