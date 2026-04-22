import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, handleApiError } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

// GET /api/admin/announcements - Get all announcements
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";

        const skip = (page - 1) * limit;

        const where = search
          ? { title: { contains: search, mode: "insensitive" as const } }
          : {};

        const [announcements, total] = await Promise.all([
          prisma.announcement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: { id: true, name: true, avatar: true },
              },
            },
          }),
          prisma.announcement.count({ where }),
        ]);

        return NextResponse.json({
          announcements,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// POST /api/admin/announcements - Create new announcement
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async (authUser) => {
      try {
        const body = await req.json();
        const { title, content, type, priority, isActive } = body;

        if (!title || !content) {
          return NextResponse.json(
            { error: "العنوان والمحتوى مطلوبان" },
            { status: 400 }
          );
        }

        const announcement = await prisma.announcement.create({
          data: {
            title,
            content,
            type: type || "INFO",
            priority: Number(priority) || 0,
            isActive: isActive ?? true,
            authorId: authUser.userId,
          },
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
        });

        return NextResponse.json(announcement);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// PATCH /api/admin/announcements - Update announcement
export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { id, title, content, type, priority, isActive } = body;

        if (!id) {
          return NextResponse.json(
            { error: "معرف الإعلان مطلوب" },
            { status: 400 }
          );
        }

        const announcement = await prisma.announcement.update({
          where: { id },
          data: {
            title,
            content,
            type,
            priority: priority !== undefined ? Number(priority) : undefined,
            isActive,
          },
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
        });

        return NextResponse.json(announcement);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// DELETE /api/admin/announcements - Delete announcement
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return NextResponse.json(
            { error: "معرف الإعلان مطلوب" },
            { status: 400 }
          );
        }

        await prisma.announcement.delete({
          where: { id },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
