import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return badRequestResponse("userId required", "MISSING_USER_ID");
    const reminders = await prisma.reminder.findMany({ where: { userId }, orderBy: { remindAt: "asc" } });
    return successResponse(reminders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, message, remindAt, repeat } = body;
    if (!userId || !title || !remindAt) return badRequestResponse("userId, title, remindAt required", "MISSING_FIELDS");
    const reminder = await prisma.reminder.create({
      data: { userId, title, message: message ?? null, remindAt: new Date(remindAt), repeat: repeat ?? null },
    });
    return successResponse(reminder);
  } catch (error) {
    return handleApiError(error);
  }
}