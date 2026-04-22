export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from '@/lib/db';
import {
  handleApiError,
  badRequestResponse,
  successResponse,
  createErrorResponse,
  withAuth,
  opsWrapper
} from "@/lib/api-utils";

const SchedulePostSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  plan: z.record(z.unknown()).or(z.array(z.unknown())).or(z.object({})).optional(),
  planJson: z.string().optional(),
  version: z.number().optional()
});

function normalizePlan(plan?: unknown, planJson?: string): unknown {
  if (typeof plan !== 'undefined') return plan;
  if (!planJson) return {};

  try {
    return JSON.parse(planJson);
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || authUser.userId;

        if (userId !== authUser.userId && authUser.role !== 'ADMIN') {
          return badRequestResponse('Invalid userId parameter', 'INVALID_PARAMETER');
        }

        let schedule = await prisma.schedule.findFirst({
          where: {
            userId,
            active: true
          }
        });

        if (!schedule) {
          const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
          });

          if (!userExists) {
            return createErrorResponse(
              'User account not found. Please sign in again.',
              401,
              undefined,
              'USER_NOT_FOUND'
            );
          }

          schedule = await prisma.schedule.create({
            data: {
              userId,
              name: "مخصص",
              title: "Default Schedule",
              startTime: new Date(),
              endTime: new Date(),
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
  });
}

export async function POST(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequestResponse('Invalid JSON body', 'INVALID_JSON');
        }

        const parsedBody = SchedulePostSchema.safeParse(body);
        if (!parsedBody.success) {
          return badRequestResponse(
            `Invalid request body: ${parsedBody.error.message}`,
            'VALIDATION_ERROR'
          );
        }

        const { userId, version, plan, planJson } = parsedBody.data;
        const normalizedPlan = normalizePlan(plan, planJson);

        if (userId !== authUser.userId) {
          return badRequestResponse('Invalid userId parameter', 'INVALID_PARAMETER');
        }

        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });

        if (!userExists) {
          return createErrorResponse(
            'User account not found. Please sign in again.',
            401,
            undefined,
            'USER_NOT_FOUND'
          );
        }

        const existing = await prisma.schedule.findFirst({
          where: {
            userId,
            active: true
          }
        });

        if (existing && existing.version > (version || 0)) {
          return createErrorResponse('CONFLICT', 409, { latest: existing }, 'CONFLICT');
        }

        const serializedPlan = JSON.stringify(normalizedPlan);

        const schedule = existing
          ? await prisma.schedule.update({
              where: { id: existing.id },
              data: {
                planJson: serializedPlan,
                version: Date.now()
              }
            })
          : await prisma.schedule.create({
              data: {
                userId,
                name: "مخصص",
                title: "Default Schedule",
                startTime: new Date(),
                endTime: new Date(),
                planJson: serializedPlan,
                active: true,
                version: Date.now()
              }
            });

        return successResponse(schedule);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
