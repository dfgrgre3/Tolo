import { NextRequest } from 'next/server';
import redisService from '@/lib/redis';
import { logger } from '@/lib/logger';

/**
 * SSE Route Handler for Real-time Updates.
 * Replaces client-side polling for progress and notifications.
 * Scalable for 1M+ users when coupled with horizontal Scaling.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 1. Initial Heartbeat
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() })}\n\n`));

      // 2. Setup Redis Sub for this specific user
      const redis = await redisService.getClient();
      const sub = redis.duplicate();
      const userChannel = `user:${userId}:events`;

      await sub.subscribe(userChannel);

      sub.on('message', (channel, message) => {
        if (channel === userChannel) {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }
      });

      // 3. Graceful cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        logger.info(`SSE Connection closed for user ${userId}`);
        sub.unsubscribe();
        sub.quit();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
