import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-bus';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api-utils';

/**
 * SSE Endpoint for Real-time Notifications
 * 
 * Flow:
 * 1. Authenticate user via middleware/withAuth
 * 2. Create a persistent HTTP connection (SSE)
 * 3. Subscribe user to notification events via EventBus
 * 4. Send heartbeats to keep connection alive
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async ({ userId }) => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // 1. Send initial connection success message
        controller.enqueue(encoder.encode('retry: 5000\n\n'));
        controller.enqueue(encoder.encode('event: connected\ndata: {"status":"ok"}\n\n'));

        // 2. Define handler for new notifications
        const notificationHandler = (notification: any) => {
          // Only send to the intended user
          if (notification.userId === userId) {
            const data = JSON.stringify(notification);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        };

        // 3. Subscribe to the event bus
        eventBus.subscribe('notification.created', notificationHandler);

        // 4. Heartbeat to keep connection alive (every 30 seconds)
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch (_err) {
            logger.debug('SSE Heartbeat failed, connection likely closed');
            clearInterval(keepAlive);
          }
        }, 30000);

        // 5. Cleanup on close
        req.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          // Note: EventBus doesn't have an easy "unsubscribe" yet in the current implementation
          // but since this is dev, it's a start. 
          // Future IMPROVEMENT: Add unsubscribe to EventBus.
          logger.debug(`Notification stream closed for user: ${userId}`);
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  });
}