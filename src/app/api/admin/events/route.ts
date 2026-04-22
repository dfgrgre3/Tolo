import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const search = searchParams.get("search") || "";
      const skip = (page - 1) * limit;

      const where = search ?
      { title: { contains: search, mode: "insensitive" as const } } :
      {};

      const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "asc" },
        include: {
          _count: {
            select: { attendees: true }
          }
        }
      }),
      prisma.event.count({ where })]
      );

      return successResponse({
        events: events.map((event: (typeof events)[number]) => ({
          ...event,
          type: event.category,
          isOnline: !event.location
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAdmin(req, async (authUser) => {
    try {
      const body = await req.json();
      const { title, description, type, startDate, endDate, location, isOnline, maxAttendees } = body;

      if (!title || !startDate || !endDate || !type) {
        return badRequestResponse("العنوان والنوع وتواريخ الحدث مطلوبة");
      }

      const event = await prisma.event.create({
        data: {
          title,
          description: normalizeOptionalString(description),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          location: isOnline ? null : normalizeOptionalString(location),
          maxAttendees: typeof maxAttendees === "number" ? maxAttendees : null,
          organizerId: authUser.userId,
          category: String(type).toUpperCase(),
          isPublic: true
        }
      });

      return successResponse(event, "تم إنشاء الحدث بنجاح", 201);
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    try {
      const body = await req.json();
      const { id, title, description, type, startDate, endDate, location, isOnline, maxAttendees } = body;

      if (!id) {
        return badRequestResponse("معرف الحدث مطلوب");
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(description !== undefined ? { description: normalizeOptionalString(description) } : {}),
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate ? { endDate: new Date(endDate) } : {}),
          ...(type ? { category: String(type).toUpperCase() } : {}),
          ...(isOnline !== undefined ?
          { location: isOnline ? null : normalizeOptionalString(location) } :
          location !== undefined ?
          { location: normalizeOptionalString(location) } :
          {}),
          ...(maxAttendees !== undefined ? { maxAttendees: typeof maxAttendees === "number" ? maxAttendees : null } : {})
        }
      });

      return successResponse(event, "تم تحديث الحدث بنجاح");
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    try {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return badRequestResponse("معرف الحدث مطلوب");
      }

      await prisma.event.delete({
        where: { id }
      });

      return successResponse({ success: true }, "تم حذف الحدث بنجاح");
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}