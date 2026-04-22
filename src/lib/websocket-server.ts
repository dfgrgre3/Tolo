import { WebSocketServer } from 'ws';
import { redisConnection } from './queue/bullmq';
import { logger } from './logger';
import { notificationQueue } from './queue/bullmq';

export interface CourseNotification {
  type: 'course_created';
  course: {
    id: string;
    title: string;
    description: string;
    instructor: string;
    subject: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    duration: number;
    thumbnailUrl?: string;
    price: number;
    rating: number;
    enrolledCount: number;
    tags: string[];
    lessonsCount?: number;
  };
}

export class WebSocketServerManager {
  private wss: WebSocketServer;
  private clients: Set<any> = new Set();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });

this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      logger.info(`WebSocket client connected. Total clients: ${this.clients.size}`);

      ws.on('message', (message) => {
        logger.debug(`Received message: ${message}`);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    this.setupNotificationListener();
    logger.info(`WebSocket server started on port ${port}`);
  }

  private setupNotificationListener() {
    notificationQueue.getInternalQueue().on('global:completed', async (jobId: string, result: any) => {
      try {
        const job = await notificationQueue.getInternalQueue().getJob(jobId);
        if (job && job.name === 'course_created') {
          const notification = job.data as CourseNotification;
          this.broadcastNotification(notification);
        }
      } catch (error) {
        logger.error('Error processing notification:', error);
      }
    });
  }

  private broadcastNotification(notification: CourseNotification) {
    const message = JSON.stringify(notification);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    logger.debug(`Broadcasted notification to ${this.clients.size} clients`);
  }

  public close() {
    this.wss.close();
    this.clients.clear();
  }
}

let websocketServer: WebSocketServerManager | null = null;

export function startWebSocketServer(port?: number): WebSocketServerManager {
  if (!websocketServer) {
    websocketServer = new WebSocketServerManager(port);
  }
  return websocketServer;
}

export function stopWebSocketServer() {
  if (websocketServer) {
    websocketServer.close();
    websocketServer = null;
  }
}