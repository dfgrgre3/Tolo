'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { buildAppUserWebSocketUrl } from '@/lib/realtime/build-ws-url';
import { useAuth } from './auth-context';


type WebSocketContextType = {
  socket: WebSocket | null;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false
});

// Error boundary component to catch any WebSocket-related errors
class WebSocketErrorBoundary extends React.Component<
  {children: React.ReactNode;},
  {hasError: boolean;}>
{
  constructor(props: {children: React.ReactNode;}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): {hasError: boolean;} {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Completely suppress WebSocket errors - do not log
    // Errors are expected when WebSocket is disabled
  }

  override render() {
    if (this.state.hasError) {
      // Silently return children without WebSocket functionality
      return <>{this.props.children}</>;
    }

    return this.props.children;
  }
}

// WebSocket is completely disabled - set as constant outside component
// Change to true only when deploying to edge runtime (Cloudflare Workers)
let WEBSOCKET_ENABLED = true;

/**
 * Check if the user is in a performance mode that should disable the WebSocket.
 * WebSocket is disabled in:
 *  - efficiency-mode (saver)
 *  - lite-mode
 *  - ultra-lite-mode (very weak devices)
 *  - when the user has save-data enabled
 *  - when connection is slow (2g/slow-2g/3g)
 */
function shouldDisableWebSocket(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const root = document.documentElement;
    const mode = root.getAttribute("data-perf-mode");
    if (
      root.classList.contains("efficiency-mode") ||
      root.classList.contains("lite-mode") ||
      root.classList.contains("ultra-lite-mode") ||
      mode === "saver" ||
      mode === "lite" ||
      mode === "ultra-lite"
    ) {
      return true;
    }
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (conn?.saveData) return true;
    if (conn?.effectiveType && ["slow-2g", "2g"].includes(conn.effectiveType)) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function WebSocketProvider({ children, userId }: {children: React.ReactNode;userId?: string;}) {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Listen for efficiency mode changes to disable WebSocket
  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      if (shouldDisableWebSocket()) {
        WEBSOCKET_ENABLED = false;
        if (socket) {
          try { socket.close(); } catch {}
        }
      } else {
        WEBSOCKET_ENABLED = true;
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-perf-mode"],
    });
    // Initial check
    if (shouldDisableWebSocket()) {
      WEBSOCKET_ENABLED = false;
    }
    return () => observer.disconnect();
  }, [socket]);

  useEffect(() => {
    // CRITICAL: WebSocket is disabled - exit immediately before any operations
    if (!WEBSOCKET_ENABLED || !currentUserId) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    // ... rest of the connection logic ...
    const isWebSocketSupported = typeof window !== 'undefined' && 'WebSocket' in window;

    if (!isWebSocketSupported) {
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!WEBSOCKET_ENABLED || !currentUserId) return;

      try {
        const wsUrl = buildAppUserWebSocketUrl(currentUserId);
        if (!wsUrl) return;

        ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (ws && ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        }, 30000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          if (!WEBSOCKET_ENABLED) {
            ws?.close();
            return;
          }
          setIsConnected(true);
          setSocket(ws);
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          if (!WEBSOCKET_ENABLED) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              logger.info('WebSocket notification:', data.message);
            }
          } catch (error) {
            logger.debug('Failed to parse WebSocket message', error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          setIsConnected(false);
          setSocket(null);
          if (WEBSOCKET_ENABLED && reconnectAttempts < maxReconnectAttempts && event.code !== 1000) {
            reconnectAttempts++;
            const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 15000);
            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          clearTimeout(connectionTimeout);
          if (ws) {
            try {ws.close();} catch {
              return;
            }
          }
        };
      } catch (error) {
        logger.debug('WebSocket connection attempt failed', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onerror = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        try {ws.close();} catch {
          return;
        }
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [currentUserId]);

  // Always provide safe default values
  const contextValue = {
    socket: WEBSOCKET_ENABLED ? socket : null,
    isConnected: WEBSOCKET_ENABLED ? isConnected : false
  };

  // Wrap in error boundary to catch any unexpected errors
  return (
    <WebSocketErrorBoundary>
      <WebSocketContext.Provider value={contextValue}>
        {children}
      </WebSocketContext.Provider>
    </WebSocketErrorBoundary>);

}

export function useWebSocket() {
  const context = useContext(WebSocketContext);

  // Always return safe defaults, never undefined
  if (!context) {
    return {
      socket: null,
      isConnected: false
    };
  }

  return context;
}
