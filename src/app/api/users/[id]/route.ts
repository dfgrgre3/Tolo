import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth-service";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      // Verify authentication
      const payload = await authService.verifyToken(request);
      if (!payload) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const authUser = { id: payload.userId, role: payload.role };

      // Users can only view their own profile
      if (authUser.id !== id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          role: true,
          avatar: true,
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          level: true,
          totalXP: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: "المستخدم غير موجود" },
          { status: 404 }
        );
      }

      // Transform to match User interface
      const userResponse = {
        ...user,
        emailVerified: user.emailVerified ?? false,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        xp: user.totalXP,
        role: user.role || "USER"
      };

      return NextResponse.json(userResponse);
    } catch (error) {
      logger.error("Error fetching user:", error);
      return NextResponse.json(
        { error: "حدث خطأ في جلب بيانات المستخدم" },
        { status: 500 }
      );
    }
  });
}

// PATCH update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      // Verify authentication
      const payload = await authService.verifyToken(request);
      if (!payload) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const authUser = { id: payload.userId, role: payload.role };

      // Users can only update their own profile
      if (authUser.id !== id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      const { name, email } = await req.json();

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email })
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true
        }
      });

      return NextResponse.json(updatedUser);
    } catch (error) {
      logger.error("Error updating user:", error);
      return NextResponse.json(
        { error: "حدث خطأ في تحديث بيانات المستخدم" },
        { status: 500 }
      );
    }
  });
}

// DELETE user account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      // Verify authentication
      const payload = await authService.verifyToken(request);
      if (!payload) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const authUser = { id: payload.userId, role: payload.role };

      // Users can only delete their own account
      if (authUser.id !== id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      // Delete user account and all related data
      // Note: This will cascade delete related records based on Prisma schema
      await prisma.user.delete({
        where: { id }
      });

      return NextResponse.json({
        message: "تم حذف الحساب بنجاح"
      });
    } catch (error) {
      logger.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "حدث خطأ في حذف الحساب" },
        { status: 500 }
      );
    }
  });
}
