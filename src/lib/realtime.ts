import { logger } from './logger';
import { getRedisClient } from './cache';
import type Redis from 'ioredis';

/**
 * --- SCALABLE REALTIME BUS (REDIS PUB/SUB) ---
 * 
 * Supports 1M+ concurrent users by distributing events across multiple app instances.
 * Uses Redis as the message backplane.
 * Refactored: Consolidates listeners to a single event dispatcher for O(1) Redis scaling.
 */
export interface RealtimeEvent {
  type: string;
  payload: any;
  timestamp: string;
}

type RealtimeHandler = (event: RealtimeEvent) => void;

class RealtimeBus {
  private static instance: RealtimeBus;
  private pub: Redis | null = null;
  private sub: Redis | null = null;
  private handlers = new Map<string, Set<RealtimeHandler>>();
  private isSubscribedGlobally = false;

  private constructor() {}

  public static getInstance() {
    if (!RealtimeBus.instance) RealtimeBus.instance = new RealtimeBus();
    return RealtimeBus.instance;
  }

  private async ensureClients() {
    if (this.pub && this.sub) return;

    const baseClient = await getRedisClient();
    if (!baseClient) {
      throw new Error('[RealtimeBus] Could not get base Redis client');
    }

    this.pub = baseClient.duplicate();
    this.sub = baseClient.duplicate();

    // Single global listener to dispatch messages to local handlers
    this.sub.on('message', (channel: string, message: string) => {
      const channelHandlers = this.handlers.get(channel);
      if (!channelHandlers) return;

      try {
        const event: RealtimeEvent = JSON.parse(message);
        channelHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (handlerErr) {
            logger.error(`[RealtimeBus] Local handler error on ${channel}:`, handlerErr);
          }
        });
      } catch (parseErr) {
        logger.error(`[RealtimeBus] Message parse error on ${channel}:`, parseErr);
      }
    });

    this.isSubscribedGlobally = true;
  }

  /**
   * Universal emit to all instances via Redis Pub/Sub
   */
  async emit(channel: string, event: RealtimeEvent) {
    try {
      await this.ensureClients();
      if (this.pub) {
        await this.pub.publish(channel, JSON.stringify(event));
      }
    } catch (error) {
      logger.error(`[RealtimeBus] Publish failed for ${channel}:`, error);
    }
  }

  /**
   * Subscribe an SSE connection to a channel
   */
  async subscribe(channel: string, onMessage: RealtimeHandler) {
    await this.ensureClients();
    if (!this.sub) return () => {};

    // 1. Register handler locally
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      // 2. Only subscribe to Redis if this is the FIRST local listener for this channel
      await this.sub.subscribe(channel);
    }
    
    this.handlers.get(channel)!.add(onMessage);

    // Return cleanup function
    return () => {
      const channelHandlers = this.handlers.get(channel);
      if (channelHandlers) {
        channelHandlers.delete(onMessage);
        
        // 3. Unsubscribe from Redis only if NO local listeners remain
        if (channelHandlers.size === 0) {
          this.handlers.delete(channel);
          this.sub?.unsubscribe(channel).catch(err => {
            logger.error(`[RealtimeBus] Unsubscribe failed for ${channel}:`, err);
          });
        }
      }
    };
  }

  /**
   * Standardized Helpers
   */
  emitUserEvent(userId: string, type: string, payload: any) {
    this.emit(`user:${userId}`, {
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  emitGlobalEvent(type: string, payload: any) {
    this.emit('global', {
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  emitProgress(userId: string, progress: any) {
    this.emitUserEvent(userId, 'PROGRESS_UPDATE', progress);
  }

  emitLeaderboard(data: any) {
    this.emitGlobalEvent('LEADERBOARD_UPDATE', data);
  }
}

export const realtimeBus = RealtimeBus.getInstance();
export default realtimeBus;
