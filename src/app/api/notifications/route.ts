import { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  parseRequestBody,
  createStandardErrorResponse,
  createSuccessResponse,
  addSecurityHeaders,
  withAuth,
  badRequestResponse,
  successResponse,
} from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { searchParams } = new URL(req.url);
        const limitParam = searchParams.get('limit') || '10';
        const offsetParam = searchParams.get('offset') || '0';
        const cursor = searchParams.get('cursor');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const limit = parseInt(limitParam, 10);
        if (isNaN(limit) || limit > 100 || limit < 1) {
          return addSecurityHeaders(badRequestResponse('Invalid limit parameter. Must be between 1 and 100.', ERROR_CODES.INVALID_PARAMETER));
        }

        const offset = parseInt(offsetParam, 10);
        if (!cursor && (isNaN(offset) || offset < 0)) {
          return addSecurityHeaders(badRequestResponse('Invalid offset parameter. Must be a non-negative integer.', ERROR_CODES.INVALID_PARAMETER));
        }

        const where: any = { userId, isDeleted: false };
        if (unreadOnly) {
          where.isRead = false;
        }

        const fetchPromise = prisma.notification.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
              }
            : {
                skip: offset,
              }),
        });

        const countPromise = prisma.notification.count({
          where: {
            userId,
            isRead: false,
            isDeleted: false,
          },
        });

        const dbTimeoutPromise = new Promise<never>((resolve, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 10000);
        });

        const [fetchedNotifications, unreadCount] = await Promise.race([
          Promise.all([fetchPromise, countPromise]),
          dbTimeoutPromise,
        ]);

        const hasMore = fetchedNotifications.length > limit;
        const notifications = hasMore ? fetchedNotifications.slice(0, limit) : fetchedNotifications;
        const nextCursor = hasMore ? notifications[notifications.length - 1]?.id ?? null : null;

        const response = successResponse({
          notifications,
          unreadCount,
          hasMore,
          nextCursor,
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
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const bodyResult = await parseRequestBody<{
          title?: string;
          message?: string;
          type?: string;
          actionUrl?: string;
          icon?: string;
        }>(req, {
          maxSize: 2048,
          required: true,
        });

        if (!bodyResult.success) {
          return bodyResult.error;
        }

        const body = bodyResult.data;
        const { title, message, type, actionUrl, icon } = body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          return addSecurityHeaders(badRequestResponse('Title is required and must be a non-empty string', ERROR_CODES.MISSING_PARAMETER));
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          return addSecurityHeaders(badRequestResponse('Message is required and must be a non-empty string', ERROR_CODES.MISSING_PARAMETER));
        }

        if (title.trim().length > 200) {
          return addSecurityHeaders(badRequestResponse('Title is too long. Maximum length is 200 characters.', ERROR_CODES.INVALID_PARAMETER));
        }

        if (message.trim().length > 1000) {
          return addSecurityHeaders(badRequestResponse('Message is too long. Maximum length is 1000 characters.', ERROR_CODES.INVALID_PARAMETER));
        }

        const validTypes = ['info', 'success', 'warning', 'error'];
        const notificationType = (type?.toLowerCase() || 'info') as 'info' | 'success' | 'warning' | 'error';
        if (!validTypes.includes(notificationType)) {
          return addSecurityHeaders(badRequestResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`, ERROR_CODES.INVALID_PARAMETER));
        }

        const { sendMultiChannelNotification } = await import('@/services/notification-sender');
        const results = await sendMultiChannelNotification({
          userId,
          title: title.trim(),
          message: message.trim(),
          type: notificationType,
          actionUrl: actionUrl && typeof actionUrl === 'string' ? actionUrl.trim() : undefined,
          icon: icon && typeof icon === 'string' ? icon.trim() : undefined,
          channels: ['app']
        });

        const { eventBus } = await import('@/lib/event-bus');
        if (results.app) {
          eventBus.publish('notification.created', results.app).catch(err =>
            logger.error('Failed to publish notification event:', err)
          );
        }

        return createSuccessResponse({ notification: results.app }, undefined, 201);
      } catch (error) {
        logger.error('Error creating notification:', error);
        return createStandardErrorResponse(
          error,
          'Failed to create notification'
        );
      }
    });
  });
}
