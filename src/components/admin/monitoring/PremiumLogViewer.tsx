"use client";

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Terminal, Search, Filter, Trash2 } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
}

export function PremiumLogViewer() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Simulated live logs (In real app, use WebSockets or SSE)
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
        const messages = [
          'Request processed successfully',
          'Database connection pool high',
          'Cache miss on course:102',
          'User authenticated: user_993',
          'New notification queued',
          'Slow query detected in subject_handler'
        ];
        
        const newLog = {
          timestamp: new Date().toLocaleTimeString(),
          level: levels[Math.floor(Math.random() * levels.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
        };
        
        setLogs(prev => [...prev.slice(-49), newLog]);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.level.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="بحث في السجلات..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setLogs([])}
          className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 text-gray-500 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
      >
        <div className="space-y-1">
          {filteredLogs.map((log, i) => (
            <m.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={i} 
              className="flex gap-4 group hover:bg-white/5 p-1 rounded transition-colors"
            >
              <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
              <span className={`font-bold shrink-0 w-12 ${
                log.level === 'ERROR' ? 'text-red-500' : 
                log.level === 'WARN' ? 'text-yellow-500' : 
                log.level === 'DEBUG' ? 'text-blue-500' : 'text-green-500'
              }`}>
                {log.level}
              </span>
              <span className="text-gray-300 break-all">{log.message}</span>
            </m.div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
              <Terminal className="w-8 h-8 opacity-20" />
              <p>في انتظار البيانات الملكية...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
