import { create } from "zustand";
import { logger } from "@/lib/logger";
import { buildAppUserWebSocketUrl } from "@/lib/realtime/build-ws-url";

type WebSocketStore = {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  listeners: Set<(event: MessageEvent) => void>;
  subscribe: (listener: (event: MessageEvent) => void) => () => void;
};

const maxReconnectAttempts = 3;

export const useWebSocketStore = create<WebSocketStore>((set, get) => {
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let connectionGeneration = 0;

  const closeCurrentSocket = () => {
    const { socket } = get();
    if (!socket) return;
    socket.onerror = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    try { socket.close(); } catch { /* ignore */ }
  };

  return {
    socket: null,
    isConnected: false,
    listeners: new Set(),

    connect: () => {
      connectionGeneration++;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      closeCurrentSocket();
      set({ socket: null, isConnected: false });
      const generation = connectionGeneration;

      // Session-scoped: the backend derives the caller's identity from the
      // HttpOnly access_token cookie. No credential is sent in the URL.
      const wsUrl = buildAppUserWebSocketUrl();
      if (!wsUrl) return;

      try {
        const ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (generation === connectionGeneration && ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        }, 30000);

        ws.onopen = () => {
          if (generation !== connectionGeneration) return;
          clearTimeout(connectionTimeout);
          set({ socket: ws, isConnected: true });
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          if (generation !== connectionGeneration) return;
          get().listeners.forEach((listener) => {
            try {
              listener(event);
            } catch (err) {
              logger.debug("Error in WebSocket message listener:", err);
            }
          });
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          if (generation !== connectionGeneration) return;
          set({ socket: null, isConnected: false });
          // Don't reconnect if closed normally (1000)
          if (reconnectAttempts < maxReconnectAttempts && event.code !== 1000) {
            reconnectAttempts++;
            const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 15000);
            reconnectTimeout = setTimeout(() => {
              // Check generation again before reconnecting to prevent race conditions
              if (generation === connectionGeneration) get().connect();
            }, delay);
          }
        };

        ws.onerror = () => {
          clearTimeout(connectionTimeout);
          try { ws.close(); } catch { /* ignore */ }
        };
      } catch (error) {
        logger.debug("WebSocket connection attempt failed", error);
      }
    },

  disconnect: () => {
    connectionGeneration++;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    closeCurrentSocket();
    reconnectAttempts = 0;
    set({ socket: null, isConnected: false });
  },

  subscribe: (listener) => {
    const { listeners } = get();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  };
});
