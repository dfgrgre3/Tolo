import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, handleApiError } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

// GET /api/admin/rewards - Get all rewards
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const type = searchParams.get("type");
        const rarity = searchParams.get("rarity");
        const isActive = searchParams.get("isActive");

        const skip = (page - 1) * limit;

        const where = {
          AND: [
            search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { description: { contains: search, mode: "insensitive" as const } },
                  ],
                }
              : {},
            type ? { type } : {},
            rarity ? { rarity } : {},
            isActive !== null ? { isActive: isActive === "true" } : {},
          ],
        };

        const [rewards, total] = await Promise.all([
          prisma.reward.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              _count: {
                select: {
                  userRewards: true,
                },
              },
            },
          }),
          prisma.reward.count({ where }),
        ]);

        return NextResponse.json({
          rewards,
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

// POST /api/admin/rewards - Create new reward
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { name, description, type, rarity, imageUrl, metadata, isTradeable, isActive } = body;

        if (!name || !type) {
          return NextResponse.json(
            { error: "الاسم والنوع مطلوبان" },
            { status: 400 }
          );
        }

        const reward = await prisma.reward.create({
          data: {
            name,
            description,
            type,
            rarity: rarity || "common",
            imageUrl,
            metadata,
            isTradeable: isTradeable ?? false,
            isActive: isActive ?? true,
          },
        });

        return NextResponse.json(reward);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// PATCH /api/admin/rewards - Update reward
export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return NextResponse.json(
            { error: "معرف المكافأة مطلوب" },
            { status: 400 }
          );
        }

        const reward = await prisma.reward.update({
          where: { id },
          data,
        });

        return NextResponse.json(reward);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// DELETE /api/admin/rewards - Delete reward
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return NextResponse.json(
            { error: "معرف المكافأة مطلوب" },
            { status: 400 }
          );
        }

        await prisma.reward.delete({
          where: { id },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
