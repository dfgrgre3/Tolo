'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/contexts/toast-context';

type WebSocketContextType = {
  socket: WebSocket | null;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export function WebSocketProvider({ children, userId }: { children: React.ReactNode, userId?: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let ws: WebSocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = userId ? `${wsProtocol}//${window.location.host}/api/ws?userId=${userId}` : `${wsProtocol}//${window.location.host}/api/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setSocket(ws);
        reconnectAttempts = 0;
        showToast({ message: 'تم الاتصال بالخادم بنجاح', type: 'success' });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            const mappedType = data.notificationType === 'warning' ? 'warning'
              : data.notificationType === 'error' || data.notificationType === 'destructive' ? 'error'
              : 'success';
            showToast({ 
              message: data.message,
              type: mappedType
            });
          } else if (data.type === 'SCHEDULE_CONFLICT') {
            showToast({
              message: 'تعارض في الجدول: تم اكتشاف تغييرات متضاربة، جاري تحميل أحدث نسخة',
              type: 'warning'
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSocket(null);
        
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(3000 * reconnectAttempts, 15000);
          setTimeout(connect, delay);
        } else {
          showToast({ 
            message: 'فشل إعادة الاتصال بالخادم. الرجاء التحقق من اتصال الإنترنت',
            type: 'error' 
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showToast({
          message: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم',
          type: 'error'
        });
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, [showToast, userId]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
