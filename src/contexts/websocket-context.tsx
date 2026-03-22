'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { useAuth } from './auth-context';


type WebSocketContextType = {
  socket: WebSocket | null;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

// Error boundary component to catch any WebSocket-related errors
class WebSocketErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Completely suppress WebSocket errors - do not log
    // Errors are expected when WebSocket is disabled
  }

  render() {
    if (this.state.hasError) {
      // Silently return children without WebSocket functionality
      return <>{this.props.children}</>;
    }

    return this.props.children;
  }
}

// WebSocket is completely disabled - set as constant outside component
// Change to true only when deploying to edge runtime (Cloudflare Workers)
const WEBSOCKET_ENABLED = false;

export function WebSocketProvider({ children, userId }: { children: React.ReactNode, userId?: string }) {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/ws?userId=${encodeURIComponent(currentUserId)}`;
        
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
          } catch (error) {}
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
            try { ws.close(); } catch {}
          }
        };
      } catch (error) {}
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onerror = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        try { ws.close(); } catch {}
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [currentUserId]); // Use currentUserId as dependency
 // Fixed: use consistent dependency array

  // Always provide safe default values
  const contextValue = {
    socket: WEBSOCKET_ENABLED ? socket : null,
    isConnected: WEBSOCKET_ENABLED ? isConnected : false,
  };

  // Wrap in error boundary to catch any unexpected errors
  return (
    <WebSocketErrorBoundary>
      <WebSocketContext.Provider value={contextValue}>
        {children}
      </WebSocketContext.Provider>
    </WebSocketErrorBoundary>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  
  // Always return safe defaults, never undefined
  if (!context) {
    return {
      socket: null,
      isConnected: false,
    };
  }
  
  return context;
}
