import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { successResponse, unauthorizedResponse, notFoundResponse, createErrorResponse, withAuth, handleApiError } from '@/lib/api-utils';

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;

        // Users can only view their own profile
        if (authUser.userId !== id) {
          return createErrorResponse("Access denied", 403);
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
          return notFoundResponse("المستخدم غير موجود");
        }

        // Transform to match User interface
        const userResponse = {
          ...user,
          emailVerified: user.emailVerified ?? false,
          twoFactorEnabled: user.twoFactorEnabled ?? false,
          xp: user.totalXP,
          role: user.role || "USER"
        };

        return successResponse(userResponse);
      } catch (error) {
        logger.error("Error fetching user:", error);
        return handleApiError(error);
      }
    });
  });
}

// PATCH update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;

        if (authUser.userId !== id) {
          return createErrorResponse("Access denied", 403);
        }

        const { name, email } = await req.json();

        // Validate that name does not contain email addresses
        if (name && typeof name === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) {
          return createErrorResponse("Name cannot be an email address", 400);
        }

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

        return successResponse(updatedUser);
      } catch (error) {
        logger.error("Error updating user:", error);
        return handleApiError(error);
      }
    });
  });
}

// DELETE user account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;

        if (authUser.userId !== id) {
          return createErrorResponse("Access denied", 403);
        }

        // Delete user account and all related data
        // Note: This will cascade delete related records based on Prisma schema
        await prisma.user.delete({
          where: { id }
        });

        return successResponse({
          message: "تم حذف الحساب بنجاح"
        });
      } catch (error) {
        logger.error("Error deleting user:", error);
        return handleApiError(error);
      }
    });
  });
}
