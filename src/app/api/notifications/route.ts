
import { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  parseRequestBody,
  createStandardErrorResponse,
  createSuccessResponse,
  addSecurityHeaders
} from '@/lib/api-utils';
import { unauthorizedResponse, badRequestResponse, successResponse } from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication via middleware
      const userId = req.headers.get("x-user-id");
      if (!userId) {
        return addSecurityHeaders(unauthorizedResponse());
      }
      const decodedToken: any = { userId: "default-user" };

      // Get and validate query parameters
      const { searchParams } = new URL(req.url);
      const limitParam = searchParams.get('limit') || '10';
      const offsetParam = searchParams.get('offset') || '0';
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit > 100 || limit < 1) {
        return addSecurityHeaders(badRequestResponse('Invalid limit parameter. Must be between 1 and 100.', ERROR_CODES.INVALID_PARAMETER));
      }

      const offset = parseInt(offsetParam, 10);
      if (isNaN(offset) || offset < 0) {
        return addSecurityHeaders(badRequestResponse('Invalid offset parameter. Must be a non-negative integer.', ERROR_CODES.INVALID_PARAMETER));
      }

      // Build where clause with proper typing
      const payload = decodedToken as any
      const where: { userId: string; isRead?: boolean } = { userId: payload.userId };
      if (unreadOnly) {
        where.isRead = false;
      }

      // Get user notifications with timeout protection
      const fetchPromise = prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const countPromise = prisma.notification.count({
        where: {
          userId: decodedToken.userId,
          isRead: false,
        },
      });

      const dbTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
      });

      const [notifications, unreadCount] = await Promise.race([
        Promise.all([fetchPromise, countPromise]),
        dbTimeoutPromise,
      ]);

      const response = successResponse({
        notifications,
        unreadCount,
        hasMore: notifications.length === limit
      });
      return addSecurityHeaders(response);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      return createStandardErrorResponse(
        error,
        'Failed to fetch notifications'
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication via middleware
      const userId = req.headers.get("x-user-id");
      if (!userId) {
        return addSecurityHeaders(unauthorizedResponse());
      }
      const decodedToken: any = { userId: "default-user" };

      // Parse request body with timeout protection using standardized helper
      const bodyResult = await parseRequestBody<{
        title?: string;
        message?: string;
        type?: string;
        actionUrl?: string;
        icon?: string;
      }>(req, {
        maxSize: 2048, // 2KB max
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const body = bodyResult.data;

      const { title, message, type, actionUrl, icon } = body;

      // Validate required fields
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return addSecurityHeaders(badRequestResponse('Title is required and must be a non-empty string', ERROR_CODES.MISSING_PARAMETER));
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return addSecurityHeaders(badRequestResponse('Message is required and must be a non-empty string', ERROR_CODES.MISSING_PARAMETER));
      }

      // Validate title and message length
      if (title.trim().length > 200) {
        return addSecurityHeaders(badRequestResponse('Title is too long. Maximum length is 200 characters.', ERROR_CODES.INVALID_PARAMETER));
      }

      if (message.trim().length > 1000) {
        return addSecurityHeaders(badRequestResponse('Message is too long. Maximum length is 1000 characters.', ERROR_CODES.INVALID_PARAMETER));
      }

      // Validate type if provided
      const validTypes = ['info', 'success', 'warning', 'error'];
      const notificationType = type || 'info';
      if (!validTypes.includes(notificationType)) {
        return addSecurityHeaders(badRequestResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`, ERROR_CODES.INVALID_PARAMETER));
      }

      // Create notification with timeout protection
      const createPromise = prisma.notification.create({
        data: {
          userId: decodedToken.userId,
          title: title.trim(),
          message: message.trim(),
          type: notificationType.toUpperCase() as any,
          actionUrl: actionUrl && typeof actionUrl === 'string' ? actionUrl.trim() : null,
          icon: icon && typeof icon === 'string' ? icon.trim() : null,
          isRead: false
        }
      });

      const createTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 10000);
      });

      const notification = await Promise.race([createPromise, createTimeoutPromise]);

      return createSuccessResponse({ notification }, undefined, 201);
    } catch (error) {
      logger.error('Error creating notification:', error);
      return createStandardErrorResponse(
        error,
        'Failed to create notification'
      );
    }
  });
}
