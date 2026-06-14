'use client';

import React, { createContext, useContext, useEffect } from 'react';
import type { ErrorInfo } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
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
  const { getToken, isLoaded } = useClerkAuth();
  const currentUserId = userId || user?.id;
  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);
  const [websocketEnabled, setWebsocketEnabled] = React.useState(true);

  // Store getToken in a ref to avoid re-triggering effects on every render.
  // getToken reference changes on every Clerk render which would cause
  // infinite reconnection loops if included in dependency arrays.
  const getTokenRef = React.useRef(getToken);
  React.useEffect(() => { getTokenRef.current = getToken; });

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Check initial state
    const initialDisabled = shouldDisableWebSocket();
    setWebsocketEnabled(!initialDisabled);

    const observer = new MutationObserver(async () => {
      const isDisabled = shouldDisableWebSocket();
      setWebsocketEnabled(!isDisabled);
      if (isDisabled) {
        disconnect();
      } else if (currentUserId && isLoaded) {
        const token = await getTokenRef.current();
        if (token) {
          connect(currentUserId, token);
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-perf-mode"],
    });

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, connect, disconnect, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!websocketEnabled || !currentUserId) {
      disconnect();
      return;
    }

    const establishConnection = async () => {
      const token = await getTokenRef.current();
      if (token) {
        connect(currentUserId, token);
      } else {
        disconnect();
      }
    };

    establishConnection();

    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, websocketEnabled, connect, disconnect, isLoaded]);

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
