import { NextRequest, NextResponse } from "next/server";
import { AchievementCategory, Difficulty } from "@/types/enums";

import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils';
import { z } from "zod";

const achievementSchema = z.object({
  key: z.string().min(1, "المفتاح مطلوب"),
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  icon: z.string().default("trophy"),
  rarity: z.string().default("common"),
  xpReward: z.number().min(0, "المكافأة يجب أن تكون 0 أو أكثر"),
  requirements: z.string().default(""),
  isSecret: z.boolean().default(false),
  category: z.enum(["STUDY", "TASKS", "EXAMS", "TIME", "STREAK"]).default("STUDY"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).default("MEDIUM"),
});


export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى لوحة التحكم");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";

        const skip = (page - 1) * limit;

        const where = search
          ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { key: { contains: search, mode: "insensitive" as const } },
            ],
          }
          : {};

        const [achievements, total] = await Promise.all([
          prisma.achievement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              _count: {
                select: { users: true },
              },
            },
          }),
          prisma.achievement.count({ where }),
        ]);

        return successResponse({
          achievements,
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

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بإنشاء إنجازات");
      }

      try {
        const body = await req.json();
        const validation = achievementSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const data = validation.data;

        const achievement = await prisma.achievement.create({
          data: {
            id: data.key,
            ...data,
            category: data.category as any,
            difficulty: data.difficulty as any,
          } as any,
        });


        return successResponse(achievement, "تم إنشاء الإنجاز بنجاح", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بحذف إنجازات");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف الإنجاز مطلوب");
        }

        await prisma.achievement.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف الإنجاز بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

