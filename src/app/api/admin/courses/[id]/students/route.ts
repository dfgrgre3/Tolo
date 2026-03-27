import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول");
      }

      try {
        const { id } = await params;
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const search = searchParams.get("search") || "";
        const skip = (page - 1) * limit;

        const course = await prisma.subject.findUnique({
          where: { id },
          select: { id: true, name: true },
        });

        if (!course) {
          return notFoundResponse("الدورة غير موجودة");
        }

        const where: any = {
          subjectId: id,
          ...(search
            ? {
                user: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              }
            : {}),
        };

        const [enrollments, total] = await Promise.all([
          prisma.subjectEnrollment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  level: true,
                  totalXP: true,
                  lastLogin: true,
                  createdAt: true,
                },
              },
            },
          }),
          prisma.subjectEnrollment.count({ where }),
        ]);

        const students = enrollments.map((enrollment) => ({
          id: enrollment.id,
          userId: enrollment.userId,
          name: enrollment.user.name || "بدون اسم",
          email: enrollment.user.email,
          avatar: enrollment.user.avatar,
          level: enrollment.user.level,
          totalXP: enrollment.user.totalXP,
          progress: enrollment.progress || 0,
          enrolledAt: enrollment.createdAt,
          lastLogin: enrollment.user.lastLogin,
          accountCreatedAt: enrollment.user.createdAt,
        }));

        return successResponse({
          students,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        logger.error("Error fetching course students", error);
        return handleApiError(error);
      }
    })
  );
}
