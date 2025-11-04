'use client';

import { createContext, useContext, useEffect, useState, ErrorInfo } from 'react';
import React from 'react';
// import { useToast } from '@/contexts/toast-context'; // Not needed - WebSocket is disabled

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
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // CRITICAL: WebSocket is disabled - exit immediately before any operations
    // This prevents any WebSocket connection attempts or error events
    if (!WEBSOCKET_ENABLED) {
      // Explicitly set state to ensure no WebSocket is used
      setSocket(null);
      setIsConnected(false);
      // Return early with empty cleanup function to prevent any errors
      return () => {
        // No-op cleanup when WebSocket is disabled
      };
    }
    
    // The code below will never execute while WEBSOCKET_ENABLED is false
    // WebSocket is currently disabled as it requires edge runtime (Cloudflare Workers)
    // The app works fine without it - it's only for real-time notifications

    // WebSocket implementation (currently disabled)
    const isWebSocketSupported = typeof window !== 'undefined' && 'WebSocket' in window;
    
    if (!isWebSocketSupported) {
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      // Double check WebSocket is still enabled
      if (!WEBSOCKET_ENABLED) {
        return;
      }

      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = userId ? `${wsProtocol}//${window.location.host}/api/ws?userId=${userId}` : `${wsProtocol}//${window.location.host}/api/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
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
              console.log('WebSocket notification:', data.message);
            } else if (data.type === 'SCHEDULE_CONFLICT') {
              console.log('WebSocket: Schedule conflict detected');
            }
          } catch (error) {
            // Only log if WebSocket is enabled
            if (WEBSOCKET_ENABLED) {
              console.warn('Error parsing WebSocket message:', error);
            }
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          setSocket(null);
          
          // Only attempt reconnect if WebSocket is still enabled
          if (WEBSOCKET_ENABLED && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(3000 * reconnectAttempts, 15000);
            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          // Completely suppress WebSocket errors when disabled
          // Do not log anything to prevent console errors
          // Silently handle - do not propagate errors
          // Prevent default error behavior
          if (ws) {
            try {
              ws.close();
            } catch {
              // Ignore any errors during cleanup
            }
          }
        };
      } catch {
        // Completely suppress errors when WebSocket is disabled
        // Do not log anything to prevent console errors
        // Silently ignore all connection errors
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws) {
        try {
          ws.onerror = null; // Remove error handler before closing
          ws.onopen = null;
          ws.onmessage = null;
          ws.onclose = null;
          ws.close();
        } catch (e) {
          // Silently ignore cleanup errors
        }
        ws = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
    // Always use consistent dependency array - include userId to avoid React warnings
    // The early exit check inside handles when WebSocket is disabled
  }, [userId]); // Fixed: use consistent dependency array

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
