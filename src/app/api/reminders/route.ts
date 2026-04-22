import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from '@/lib/db';
import { handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";

// Validation schemas
const ReminderCreateSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  title: z.string().min(1, "title is required").max(200, "title is too long"),
  message: z.string().max(1000, "message is too long").optional().nullable(),
  remindAt: z.string().datetime().or(z.date()),
  repeat: z.string().optional().nullable()
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Validate userId parameter
    if (!userId || userId === 'undefined' || userId.trim() === '') {
      return badRequestResponse("userId is required", 'MISSING_USER_ID');
    }
    const reminders = await prisma.reminder.findMany({ where: { userId }, orderBy: { remindAt: "asc" } });
    return successResponse(reminders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const parsedBody = ReminderCreateSchema.safeParse(body);
    if (!parsedBody.success) {
      return badRequestResponse(
        `Invalid request body: ${parsedBody.error.message}`,
        'VALIDATION_ERROR'
      );
    }

    const { userId, title, message, remindAt, repeat } = parsedBody.data;

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        title,
        message: message ?? null,
        remindAt: typeof remindAt === 'string' ? new Date(remindAt) : remindAt,
        repeat: repeat ?? null
      }
    });
    return successResponse(reminder, 'Reminder created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}