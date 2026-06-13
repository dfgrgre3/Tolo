'use client';

import React, { createContext, useContext, useEffect } from 'react';
import type { ErrorInfo } from 'react';
import { useAuth } from './auth-context';
import { useWebSocketStore } from './websocket-store';

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
    return { hasError: true };
  }

  override componentDidCatch() {
    // Suppressed
  }

  override render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

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
  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);
  const [websocketEnabled, setWebsocketEnabled] = React.useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Check initial state
    const initialDisabled = shouldDisableWebSocket();
    setWebsocketEnabled(!initialDisabled);

    const observer = new MutationObserver(() => {
      const isDisabled = shouldDisableWebSocket();
      setWebsocketEnabled(!isDisabled);
      if (isDisabled) {
        disconnect();
      } else if (currentUserId) {
        connect(currentUserId);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-perf-mode"],
    });

    return () => observer.disconnect();
  }, [currentUserId, connect, disconnect]);

  useEffect(() => {
    if (!websocketEnabled || !currentUserId) {
      disconnect();
      return;
    }

    connect(currentUserId);

    return () => {
      disconnect();
    };
  }, [currentUserId, websocketEnabled, connect, disconnect]);

  const socket = useWebSocketStore((state) => state.socket);
  const isConnected = useWebSocketStore((state) => state.isConnected);

  const contextValue = {
    socket: websocketEnabled ? socket : null,
    isConnected: websocketEnabled ? isConnected : false
  };

  return (
    <WebSocketErrorBoundary>
      <WebSocketContext.Provider value={contextValue}>
        {children}
      </WebSocketContext.Provider>
    </WebSocketErrorBoundary>
  );
}

export function useWebSocket() {
  const socket = useWebSocketStore((state) => state.socket);
  const isConnected = useWebSocketStore((state) => state.isConnected);
  return { socket, isConnected };
}
