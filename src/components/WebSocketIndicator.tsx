'use client';

import { useWebSocket } from '../contexts/websocket-context';

export default function WebSocketIndicator() {
  const { isConnected } = useWebSocket();
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isConnected ? (
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      ) : (
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
      )}
    </div>
  );
}
