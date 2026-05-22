'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { logger } from '@/lib/logger';

export type AdminEventType =
  | 'new_ticket'
  | 'ticket_updated'
  | 'new_payment'
  | 'payment_refunded'
  | 'user_registered'
  | 'user_login'
  | 'course_created'
  | 'course_updated'
  | 'exam_submitted'
  | 'live_session_started'
  | 'live_session_ended'
  | 'announcement_published';

export interface AdminEvent {
  type: AdminEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

type EventHandler = (event: AdminEvent) => void;

const handlersMap = new Map<AdminEventType, Set<EventHandler>>();

function registerHandler(type: AdminEventType, handler: EventHandler) {
  if (!handlersMap.has(type)) {
    handlersMap.set(type, new Set());
  }
  handlersMap.get(type)!.add(handler);
}

function unregisterHandler(type: AdminEventType, handler: EventHandler) {
  handlersMap.get(type)?.delete(handler);
}

function dispatchAdminEvent(event: AdminEvent) {
  const handlers = handlersMap.get(event.type);
  if (handlers) {
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        logger.error('Error in admin event handler:', error);
      }
    });
  }
}

export function useAdminRealtime() {
  const { socket, isConnected } = useWebSocket();
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const subscribe = useCallback((type: AdminEventType, handler: EventHandler) => {
    registerHandler(type, handler);
    return () => unregisterHandler(type, handler);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type && data.type.startsWith('admin_')) {
          const adminEventType = data.type.replace('admin_', '') as AdminEventType;
          dispatchAdminEvent({
            type: adminEventType,
            data: data.payload || {},
            timestamp: data.timestamp || new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.debug('Failed to parse admin WebSocket message', error);
      }
    };

    messageHandlerRef.current = handleMessage;
    socket.addEventListener('message', handleMessage);

    return () => {
      if (socket && messageHandlerRef.current) {
        socket.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, [socket, isConnected]);

  return { subscribe, isConnected };
}

export function useTicketRealtime(onNewTicket?: () => void, onTicketUpdate?: () => void) {
  const { subscribe, isConnected } = useAdminRealtime();

  useEffect(() => {
    if (!onNewTicket && !onTicketUpdate) return;

    const unsubNew = onNewTicket ? subscribe('new_ticket', () => onNewTicket()) : undefined;
    const unsubUpdate = onTicketUpdate ? subscribe('ticket_updated', () => onTicketUpdate()) : undefined;

    return () => {
      unsubNew?.();
      unsubUpdate?.();
    };
  }, [subscribe, onNewTicket, onTicketUpdate]);

  return { isConnected };
}

export function usePaymentRealtime(onNewPayment?: () => void, onRefund?: () => void) {
  const { subscribe, isConnected } = useAdminRealtime();

  useEffect(() => {
    if (!onNewPayment && !onRefund) return;

    const unsubNew = onNewPayment ? subscribe('new_payment', () => onNewPayment()) : undefined;
    const unsubRefund = onRefund ? subscribe('payment_refunded', () => onRefund()) : undefined;

    return () => {
      unsubNew?.();
      unsubRefund?.();
    };
  }, [subscribe, onNewPayment, onRefund]);

  return { isConnected };
}

export function useLiveMonitoringRealtime(onSessionStart?: () => void, onSessionEnd?: () => void) {
  const { subscribe, isConnected } = useAdminRealtime();

  useEffect(() => {
    if (!onSessionStart && !onSessionEnd) return;

    const unsubStart = onSessionStart ? subscribe('live_session_started', () => onSessionStart()) : undefined;
    const unsubEnd = onSessionEnd ? subscribe('live_session_ended', () => onSessionEnd()) : undefined;

    return () => {
      unsubStart?.();
      unsubEnd?.();
    };
  }, [subscribe, onSessionStart, onSessionEnd]);

  return { isConnected };
}
