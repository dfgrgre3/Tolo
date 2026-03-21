import { NextRequest } from "next/server";
import { prisma } from '@/lib/db-unified';
import { successResponse, handleApiError } from '@/lib/api-utils';

// Create a lightweight guest user and return its id for local usage
// The time management page stores this id in localStorage and uses it
// to scope all schedule/tasks/sessions/reminders requests.
export async function POST(_req: NextRequest) {
  try {
    const rand = Math.random().toString(36).slice(2);
    const email = `guest-${Date.now()}-${rand}@guest.local`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: rand, // random placeholder for required field
        name: "Guest",
      },
      select: { id: true },
    });

    return successResponse({ id: user.id });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}