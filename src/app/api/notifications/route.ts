
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { 
  parseRequestBody, 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication with timeout protection
      const verifyPromise = Promise.resolve(verifyToken(req));
      const verifyTimeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });

      const decodedToken = await Promise.race([verifyPromise, verifyTimeoutPromise]);
      if (!decodedToken) {
        const response = NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

      // Get and validate query parameters
      const { searchParams } = new URL(req.url);
      const limitParam = searchParams.get('limit') || '10';
      const offsetParam = searchParams.get('offset') || '0';
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit > 100 || limit < 1) {
        const response = NextResponse.json(
          { error: 'Invalid limit parameter. Must be between 1 and 100.', code: 'INVALID_PARAMETER' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      const offset = parseInt(offsetParam, 10);
      if (isNaN(offset) || offset < 0) {
        const response = NextResponse.json(
          { error: 'Invalid offset parameter. Must be a non-negative integer.', code: 'INVALID_PARAMETER' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Build where clause with proper typing
      const where: { userId: string; isRead?: boolean } = { userId: decodedToken.userId };
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

      const response = NextResponse.json({ 
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
      // Verify authentication with timeout protection
      const verifyPromise = Promise.resolve(verifyToken(req));
      const verifyTimeoutPromise2 = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });

      const decodedToken = await Promise.race([verifyPromise, verifyTimeoutPromise2]);
      if (!decodedToken) {
        const response = NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

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
        const response = NextResponse.json(
          { error: 'Title is required and must be a non-empty string', code: 'MISSING_TITLE' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        const response = NextResponse.json(
          { error: 'Message is required and must be a non-empty string', code: 'MISSING_MESSAGE' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Validate title and message length
      if (title.trim().length > 200) {
        const response = NextResponse.json(
          { error: 'Title is too long. Maximum length is 200 characters.', code: 'TITLE_TOO_LONG' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      if (message.trim().length > 1000) {
        const response = NextResponse.json(
          { error: 'Message is too long. Maximum length is 1000 characters.', code: 'MESSAGE_TOO_LONG' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Validate type if provided
      const validTypes = ['info', 'success', 'warning', 'error'];
      const notificationType = type || 'info';
      if (!validTypes.includes(notificationType)) {
        const response = NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_TYPE' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Create notification with timeout protection
      const createPromise = prisma.notification.create({
        data: {
          userId: decodedToken.userId,
          title: title.trim(),
          message: message.trim(),
          type: notificationType,
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
