import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URLSearchParams } from 'url';

type WsMessage = {
  type: 'notification' | 'data' | 'ping' | 'pong';
  payload?: any;
  timestamp?: number;
};

export class WSService {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocket>();
  private pingInterval = 30000; // 30 seconds

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port });
    console.log(`[WebSocket] Server started on port ${port}`);
    this.setupEvents();
  }

  private setupEvents() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[WebSocket] New connection from:', req.socket.remoteAddress);
      const userId = this.getUserIdFromRequest(req);
      if (userId) {
        this.clients.set(userId, ws);
      }

      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, this.pingInterval);

      ws.on('message', (data: string) => {
        if (userId) {
          const message: WsMessage = JSON.parse(data.toString());
          if (message.type === 'pong') {
            console.log('[WebSocket] Received pong');
          } else {
            this.handleMessage(userId, message);
          }
        }
      });

      ws.on('close', () => {
        clearInterval(pingInterval);
        if (userId) {
          this.clients.delete(userId);
        }
      });
    });
  }

  private getUserIdFromRequest(req: IncomingMessage): string | null {
    const params = new URLSearchParams(req.url?.split('?')[1] || '');
    return params.get('userId');
  }

  private handleMessage(userId: string, message: WsMessage) {
    // Handle incoming messages
  }

  sendToUser(userId: string, message: any) {
    const ws = this.clients.get(userId);
    if (ws) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: any) {
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
