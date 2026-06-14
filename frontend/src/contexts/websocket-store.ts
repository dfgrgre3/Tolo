import { create } from "zustand";
import { logger } from "@/lib/logger";
import { buildAppUserWebSocketUrl } from "@/lib/realtime/build-ws-url";

type WebSocketStore = {
  socket: WebSocket | null;
  isConnected: boolean;
  token: string | null;
  connect: (userId: string, token?: string) => void;
  disconnect: () => void;
  listeners: Set<(event: MessageEvent) => void>;
  subscribe: (listener: (event: MessageEvent) => void) => () => void;
};

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  token: null,
  listeners: new Set(),

  connect: (userId: string, token?: string) => {
    // Cleanup existing if any
    get().disconnect();

    const currentToken = token !== undefined ? token : get().token;
    if (token !== undefined) {
      set({ token });
    }

    const wsUrl = buildAppUserWebSocketUrl(userId, currentToken || undefined);
    if (!wsUrl) return;

    try {
      const ws = new WebSocket(wsUrl);
      
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }, 30000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        set({ socket: ws, isConnected: true });
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
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
        set({ socket: null, isConnected: false });
        // Don't reconnect if closed normally (1000)
        if (reconnectAttempts < maxReconnectAttempts && event.code !== 1000) {
          reconnectAttempts++;
          const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 15000);
          reconnectTimeout = setTimeout(() => get().connect(userId, currentToken || undefined), delay);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        try { ws.close(); } catch {}
      };
    } catch (error) {
      logger.debug("WebSocket connection attempt failed", error);
    }
  },

  disconnect: () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    const { socket } = get();
    if (socket) {
      socket.onerror = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      try { socket.close(); } catch {}
    }
    set({ socket: null, isConnected: false, token: null });
  },

  subscribe: (listener) => {
    const { listeners } = get();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
}));
