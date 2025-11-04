'use client';

import { createContext, useContext, useEffect, useState } from 'react';
// import { useToast } from '@/contexts/toast-context'; // Not needed - WebSocket is disabled

type WebSocketContextType = {
  socket: WebSocket | null;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export function WebSocketProvider({ children, userId }: { children: React.ReactNode, userId?: string }) {
  // WebSocket is completely disabled - set as constant
  // Change to true only when deploying to edge runtime (Cloudflare Workers)
  const WEBSOCKET_ENABLED = false;
  
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // CRITICAL: WebSocket is disabled - exit immediately before any operations
    // This prevents any WebSocket connection attempts
    if (!WEBSOCKET_ENABLED) {
      return;
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
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = userId ? `${wsProtocol}//${window.location.host}/api/ws?userId=${userId}` : `${wsProtocol}//${window.location.host}/api/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setSocket(ws);
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              console.log('WebSocket notification:', data.message);
            } else if (data.type === 'SCHEDULE_CONFLICT') {
              console.log('WebSocket: Schedule conflict detected');
            }
          } catch (error) {
            console.warn('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          setSocket(null);
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(3000 * reconnectAttempts, 15000);
            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          // Silently handle WebSocket errors
        };
      } catch (error) {
        // Silently handle errors
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [userId]); // Removed showToast since WebSocket is disabled

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
