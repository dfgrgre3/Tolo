import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from '@/lib/db';
import { authService } from "@/lib/services/auth-service";
import { handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

// Validation schemas
const SchedulePostSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  plan: z.record(z.unknown()).or(z.array(z.unknown())).or(z.object({})),
  version: z.number().optional(),
});



export async function GET(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    try {
      // Verify authentication via middleware
      // Verify authentication via middleware
      const authUserId = request.headers.get("x-user-id");
      const userRole = request.headers.get("x-user-role");

      if (!authUserId) {
        return badRequestResponse('Unauthorized', 'UNAUTHORIZED');
      }
      const authUser = { id: authUserId, role: userRole };

      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");

      // Validate userId parameter
      if (!userId || userId === 'undefined' || userId.trim() === '') {
        return badRequestResponse('userId parameter is required', 'MISSING_USER_ID');
      }

      // For security, we should only allow fetching the authenticated user's schedule
      // unless there's a specific admin requirement
      if (userId !== authUser.id) {
        return badRequestResponse('Invalid userId parameter', 'INVALID_PARAMETER');
      }

      let schedule = await prisma.schedule.findFirst({
        where: {
          userId,
          active: true
        }
      });

      if (!schedule) {
        schedule = await prisma.schedule.create({
          data: {
            userId,
            name: "مخصص",
            title: "Default Schedule",
            startTime: new Date(),
            endTime: new Date(),
            // weeklyHours: 0, // Removed
            planJson: JSON.stringify({}),
            active: true
          }
        });
      }

      return successResponse(schedule);
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function POST(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    try {
      // Verify authentication via middleware
      // Verify authentication via middleware
      const authUserId = request.headers.get("x-user-id");
      const userRole = request.headers.get("x-user-role");

      if (!authUserId) {
        return badRequestResponse('Unauthorized', 'UNAUTHORIZED');
      }
      const authUser = { id: authUserId, role: userRole };

      let body;
      try {
        body = await request.json();
      } catch (error) {
        return badRequestResponse('Invalid JSON body', 'INVALID_JSON');
      }

      // Validate request body
      const parsedBody = SchedulePostSchema.safeParse(body);
      if (!parsedBody.success) {
        return badRequestResponse(
          `Invalid request body: ${parsedBody.error.message}`,
          'VALIDATION_ERROR'
        );
      }

      const { userId, plan, version } = parsedBody.data;

      // For security, we should only allow modifying the authenticated user's schedule
      if (userId !== authUser.id) {
        return badRequestResponse('Invalid userId parameter', 'INVALID_PARAMETER');
      }

      const existing = await prisma.schedule.findFirst({
        where: {
          userId,
          active: true
        }
      });

      if (existing && existing.version > (version || 0)) {
        return NextResponse.json(
          { error: 'CONFLICT', latest: existing },
          { status: 409 }
        );
      }

      const schedule = await prisma.schedule.upsert({
        where: {
          userId_active: {
            userId,
            active: true
          }
        },
        update: {
          planJson: JSON.stringify(plan),
          version: Date.now()
        },
        create: {
          userId,
          name: "مخصص",
          title: "Default Schedule",
          startTime: new Date(),
          endTime: new Date(),
          // weeklyHours: 0, // Removed
          planJson: JSON.stringify(plan),
          active: true,
          version: Date.now()
        },
      });

      return successResponse(schedule);
    } catch (error) {
      return handleApiError(error);
    }
  });
}