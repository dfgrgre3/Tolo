import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/modules/users/user.service";
import { rateLimit } from "@/lib/middleware/rate-limiter";
import { logger } from '@/lib/logger';
import { 
  successResponse, 
  createErrorResponse, 
  withAuth, 
  handleApiError, 
  notFoundResponse 
} from '@/lib/api-utils';

/**
 * GET user by ID
 * Optimized with Redis Caching and Rate Limiting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Rate Limiting (Distributed)
  const { success, headers } = await rateLimit(request);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  }

  return withAuth(request, async (authUser) => {
    try {
      const { id } = await params;

      // Access Control: Users only view their own profile
      if (authUser.userId !== id) {
        return createErrorResponse("Access denied", 403);
      }

      // 2. Optimized Lookup (Service with Redis Fallback)
      const user = await userService.getProfile(id);

      if (!user) {
        return notFoundResponse("المستخدم غير موجود");
      }

      const res = successResponse(user);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (error) {
      logger.error("Error fetching user:", error);
      return handleApiError(error);
    }
  });
}

/**
 * PATCH update user profile
 * Handles Smart Cache Invalidation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authUser) => {
    try {
      const { id } = await params;

      if (authUser.userId !== id) {
        return createErrorResponse("Access denied", 403);
      }

      const { name, email } = await request.json();

      // Validation
      if (name && typeof name === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) {
        return createErrorResponse("Name cannot be an email address", 400);
      }

      // 3. Update via Service (Invalidates Redis Automatically)
      const updatedUser = await userService.updateProfile(id, {
        ...(name && { name }),
        ...(email && { email })
      });

      return successResponse(updatedUser);
    } catch (error) {
      logger.error("Error updating user:", error);
      return handleApiError(error);
    }
  });
}

/**
 * DELETE user account
 * Implements consistent Soft Delete pattern
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authUser) => {
    try {
      const { id } = await params;

      if (authUser.userId !== id) {
        return createErrorResponse("Access denied", 403);
      }

      // 4. Soft Delete via Service
      await userService.softDelete(id);

      return successResponse({
        message: "تم تعطيل الحساب بنجاح (Soft Delete)"
      });
    } catch (error) {
      logger.error("Error soft-deleting user:", error);
      return handleApiError(error);
    }
  });
}

