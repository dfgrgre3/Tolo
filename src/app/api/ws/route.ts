import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type WebSocketMessage = {
  type: 'notification' | 'data' | 'ping' | 'pong' | 'SCHEDULE_UPDATE' | 'SCHEDULE_CONFLICT';
  payload?: any;
};

export async function GET(req: NextRequest) {
  const upgradeHeader = req.headers.get('upgrade') || '';
  if (upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  const pair = (globalThis as any).WebSocketPair ? new (globalThis as any).WebSocketPair() : null;
  if (!pair) {
    return new Response('WebSocket not supported', { status: 500 });
  }
  const [client, server] = Object.values(pair) as any as [any, any];

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || undefined;

  // Accept the server side of the pair and set up event handlers
  (server as any).accept();

  // Heartbeat / ping-pong
  const pingInterval = setInterval(() => {
    try {
      (server as any).send(JSON.stringify({ type: 'ping' }));
    } catch {
      clearInterval(pingInterval);
    }
  }, 30000);

  (server as any).addEventListener('message', (event: MessageEvent) => {
    const message = typeof event.data === 'string' ? event.data : '';
    try {
      const data = JSON.parse(message) as WebSocketMessage;
      if (!data.type) throw new Error('Invalid message format');

      switch (data.type) {
        case 'ping': {
          (server as any).send(JSON.stringify({ type: 'pong' }));
          break;
        }
        case 'notification': {
          // Here you could validate and echo back or broadcast
          break;
        }
        case 'SCHEDULE_UPDATE': {
          // Implement broadcast with durable objects or middleware if needed
          break;
        }
        case 'SCHEDULE_CONFLICT': {
          // Handle conflict semantics if needed
          break;
        }
        default: {
          // No-op
        }
      }
    } catch (err) {
      (server as any).send(JSON.stringify({ type: 'notification', message: 'Invalid message received' }));
    }
  });

  (server as any).addEventListener('close', () => {
    clearInterval(pingInterval);
  });

  return new Response(null as any, { status: 101, webSocket: client } as any);
}
