import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, UserRole } from "@prisma/client";
import { withAdmin, handleApiError, successResponse, badRequestResponse, notFoundResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { PasswordService } from "@/services/auth/password-service";

// GET /api/admin/users - Get all users with pagination and filters
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") as UserRole | null;
        const sortBy = searchParams.get("sortBy") || "createdAt";
        const sortOrder = (searchParams.get("sortOrder") || "desc") as 'asc' | 'desc';

        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
          AND: [
            { isDeleted: false }, // Critical: Only show active users by default
            search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { username: { contains: search, mode: "insensitive" as const } },
                  ],
                }
              : {},
            role ? { role } : {},
          ],
        };

        const { CacheService } = await import("@/lib/cache");

        const [users, total, totalAdmins, powerUsers] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
              [sortBy]: sortOrder,
            },
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
              permissions: true,
              emailVerified: true,
              createdAt: true,
              lastLogin: true,
              xp: {
                select: {
                  totalXP: true,
                  level: true,
                }
              },
              activity: {
                select: {
                  currentStreak: true,
                }
              },
              sessions: {
                where: {
                  isActive: true,
                },
                select: {
                  id: true,
                },
              },
              _count: {
                select: {
                  tasks: true,
                  studySessions: true,
                  achievements: true,
                },
              },
            },
          }),
          prisma.user.count({ where }),
          // Cache global stats for 5 minutes to reduce DB load
          CacheService.getOrSet("admin:users:stats:total_admins", () => 
            prisma.user.count({ where: { role: UserRole.ADMIN } }), 
            300
          ),
          CacheService.getOrSet("admin:users:stats:power_users", () => 
            prisma.user.count({ where: { xp: { level: { gt: 10 } } } }),
            300
          ),
        ]);

        // Flatten users for frontend consistency
        const flattenedUsers = users.map((u: any) => ({
          ...u,
          totalXP: u.xp?.totalXP || 0,
          level: u.xp?.level || 1,
          currentStreak: u.activity?.currentStreak || 0,
          // Remove relation objects to keep response clean
          xp: undefined,
          activity: undefined,
        }));

        return successResponse({
          users: flattenedUsers,
          summary: {
            totalUsers: total,
            totalAdmins,
            powerUsers,
          },
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

// POST /api/admin/users - Create a new user
export async function POST(req: NextRequest) {
  return withAdmin(req, async () => {
    try {
      const body = await req.json();
      const { name, email, username, password, role } = body;

      // Validate that name does not contain email addresses
      if (name && typeof name === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) {
        return NextResponse.json(
          { error: "الاسم لا يمكن أن يكون عنوان بريد إلكتروني" },
          { status: 400 }
        );
      }

      if (!email || !password || !role) {
        return badRequestResponse("البريد الإلكتروني وكلمة المرور والدور مطلوبون");
      }

      const hashedPassword = await PasswordService.hash(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          username,
          passwordHash: hashedPassword,
          role: role as UserRole,
          emailVerified: true,
        },
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      return successResponse(userWithoutPassword, "تم إنشاء المستخدم بنجاح", 201);
    } catch (error) {
      return handleApiError(error);
    }
  });
}

// PATCH /api/admin/users - Update user role or permissions
export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = await req.json();
        const { userId, role, permissions } = body;

        if (!userId || (!role && !permissions)) {
          return badRequestResponse("معرف المستخدم والدور أو الصلاحيات مطلوبان");
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: {
            ...(role && { role: role as UserRole }),
            ...(permissions && { permissions }),
          },
        });

        return successResponse(user, "تم تحديث بيانات المستخدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// DELETE /api/admin/users - Delete user
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
          return badRequestResponse("معرف المستخدم مطلوب");
        }

        // Perform Soft Delete to preserve historical associations (XP, Exams, Logs)
        await prisma.user.update({
          where: { id: userId },
          data: { 
            isDeleted: true,
            deletedAt: new Date(),
            status: 'DELETED' // Ensure status reflects deletion
          }
        });

        return successResponse(null, "تم حذف المستخدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
