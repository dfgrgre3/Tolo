import { NextRequest, NextResponse } from 'next/server';
import { WebSocketServer } from 'ws';
import { startWebSocketServer } from '@/lib/websocket-server';
import { logger } from '@/lib/logger';

let websocketServer: any = null;

export async function GET(request: NextRequest) {
  if (!websocketServer) {
    websocketServer = startWebSocketServer();
  }

  return NextResponse.json({ message: 'WebSocket server is running' });
}

export function websocket() {
  return new WebSocketServer({ noServer: true });
}

export async function upgrade(request: NextRequest, socket: any, head: any) {
  if (!websocketServer) {
    websocketServer = startWebSocketServer();
  }

  websocketServer.wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
    websocketServer.wss.emit('connection', ws, request);
  });
}
