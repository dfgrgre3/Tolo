/**
 * أمثلة كود للتطويرات المقترحة للـ Header
 * Code Examples for Header Enhancements
 */

// ==================== مثال 1: Command Palette ====================
export const commandPaletteExample = `
// src/components/header/CommandPalette.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const commands: CommandItem[] = [
    {
      id: "search",
      label: "بحث",
      icon: <Search />,
      action: () => {/* فتح البحث */},
      keywords: ["بحث", "search", "find"]
    },
    {
      id: "notifications",
      label: "الإشعارات",
      icon: <Bell />,
      action: () => {/* فتح الإشعارات */},
      keywords: ["إشعارات", "notifications"]
    },
    // ... المزيد
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <Command className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
            <Command.Input placeholder="اكتب أمراً أو ابحث..." />
            <Command.List>
              <Command.Empty>لا توجد نتائج</Command.Empty>
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => {
                    cmd.action();
                    setOpen(false);
                  }}
                >
                  {cmd.icon}
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
`;

// ==================== مثال 2: Quick Actions Menu ====================
export const quickActionsExample = `
// src/components/header/QuickActions.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, FileText, Calendar, MessageSquare } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions: QuickAction[] = [
    {
      id: "new-course",
      label: "دورة جديدة",
      icon: <Plus />,
      action: () => {/* إنشاء دورة */},
      color: "bg-blue-500"
    },
    {
      id: "new-note",
      label: "ملاحظة جديدة",
      icon: <FileText />,
      action: () => {/* إنشاء ملاحظة */},
      color: "bg-green-500"
    },
    // ... المزيد
  ];

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-primary text-primary-foreground"
      >
        <Zap className="h-5 w-5" />
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-background border rounded-lg shadow-xl p-2"
          >
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className={\`p-2 rounded-lg \${action.color} text-white\`}>
                  {action.icon}
                </div>
                <span>{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

// ==================== مثال 3: Smart Navigation ====================
export const smartNavigationExample = `
// src/components/header/SmartNavigation.tsx
"use client";

import { useMemo } from "react";
import { useNavigationHistory } from "@/hooks/use-navigation-history";

export function SmartNavigation({ items }: { items: NavItem[] }) {
  const { getMostVisited, getRecentPages } = useNavigationHistory();
  
  const smartOrderedItems = useMemo(() => {
    const mostVisited = getMostVisited(10);
    const recent = getRecentPages(10);
    
    // ترتيب العناصر حسب الاستخدام
    return items.sort((a, b) => {
      const aVisits = mostVisited.find(m => m.path === a.href)?.count || 0;
      const bVisits = mostVisited.find(m => m.path === b.href)?.count || 0;
      
      // إعطاء أولوية للعناصر الأكثر زيارة
      if (aVisits !== bVisits) {
        return bVisits - aVisits;
      }
      
      // ثم حسب التاريخ الأخير
      const aRecent = recent.find(r => r.path === a.href);
      const bRecent = recent.find(r => r.path === b.href);
      
      if (aRecent && bRecent) {
        return new Date(bRecent.timestamp).getTime() - new Date(aRecent.timestamp).getTime();
      }
      
      return 0;
    });
  }, [items, getMostVisited, getRecentPages]);
  
  return (
    <nav>
      {smartOrderedItems.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </nav>
  );
}
`;

// ==================== مثال 4: Voice Search ====================
export const voiceSearchExample = `
// src/components/header/VoiceSearch.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

export function VoiceSearch({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "ar-SA"; // العربية السعودية
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          onTranscript(transcript);
        };
        
        recognition.onerror = (event) => {
          logger.error("Voice recognition error:", event.error);
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);
  
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };
  
  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={\`p-2 rounded-lg transition-all \${isListening ? "bg-red-500 text-white animate-pulse" : "bg-accent"}\`}
    >
      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}
`;

// ==================== مثال 5: Offline Mode ====================
export const offlineModeExample = `
// src/components/header/OfflineIndicator.tsx
"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white p-2 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>أنت غير متصل بالإنترنت. يتم العمل في وضع عدم الاتصال.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
`;

// ==================== مثال 6: Session Management ====================
export const sessionManagementExample = `
// src/components/header/SessionManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Shield, Monitor, Smartphone, Tablet } from "lucide-react";

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  
  useEffect(() => {
    // جلب الجلسات من API
    fetch("/api/sessions")
      .then(res => res.json())
      .then(data => setSessions(data.sessions));
  }, []);
  
  const revokeSession = async (sessionId: string) => {
    await fetch(\`/api/sessions/\${sessionId}\`, { method: "DELETE" });
    setSessions(sessions.filter(s => s.id !== sessionId));
  };
  
  const getDeviceIcon = (device: string) => {
    if (device.includes("Mobile")) return <Smartphone />;
    if (device.includes("Tablet")) return <Tablet />;
    return <Monitor />;
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2">
        <Shield className="h-4 w-4" />
        <span className="font-semibold">الجلسات النشطة</span>
      </div>
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <div className="flex items-center gap-3">
            {getDeviceIcon(session.device)}
            <div>
              <p className="font-medium">{session.device}</p>
              <p className="text-sm text-muted-foreground">
                {session.location} • {new Date(session.lastActive).toLocaleDateString("ar")}
              </p>
            </div>
          </div>
          {!session.isCurrent && (
            <button
              onClick={() => revokeSession(session.id)}
              className="text-destructive hover:underline"
            >
              إنهاء الجلسة
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
`;

// ==================== مثال 7: Performance Monitoring ====================
export const performanceMonitoringExample = `
// src/hooks/useHeaderPerformance.ts
import { useEffect, useRef } from "react";

export function useHeaderPerformance() {
  const renderStartRef = useRef<number>(0);
  
  useEffect(() => {
    // قياس وقت التصيير
    renderStartRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartRef.current;
      
      // إرسال البيانات للتحليلات
      if (typeof window !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/analytics/performance", JSON.stringify({
          component: "Header",
          renderTime,
          timestamp: Date.now()
        }));
      }
    };
  }, []);
  
  // قياس Web Vitals
  useEffect(() => {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // معالجة Web Vitals
          logger.info("Performance Entry:", entry);
        }
      });
      
      observer.observe({ entryTypes: ["measure", "navigation", "paint"] });
      
      return () => observer.disconnect();
    }
  }, []);
}
`;

// ==================== مثال 8: Accessibility Enhancements ====================
export const accessibilityExample = `
// src/components/header/AccessibleHeader.tsx
"use client";

import { useEffect, useRef } from "react";

export function AccessibleHeader() {
  const headerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    // إضافة ARIA labels
    const nav = headerRef.current?.querySelector("nav");
    if (nav) {
      nav.setAttribute("aria-label", "القائمة الرئيسية");
      nav.setAttribute("role", "navigation");
    }
    
    // إدارة التركيز
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape لإغلاق القوائم
      if (e.key === "Escape") {
        // إغلاق جميع القوائم المفتوحة
      }
      
      // Tab للتنقل
      if (e.key === "Tab") {
        // التأكد من أن التركيز مرئي
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  return (
    <header
      ref={headerRef}
      role="banner"
      aria-label="رأس الصفحة"
    >
      {/* محتوى الـ Header */}
    </header>
  );
}
`;

// ==================== مثال 9: Virtual Scrolling ====================
export const virtualScrollingExample = `
// استخدام react-window للقوائم الطويلة
import { FixedSizeList } from "react-window";
import { logger } from '@/lib/logger';

export function VirtualizedNotificationList({ notifications }: { notifications: Notification[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <NotificationItem notification={notifications[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={400}
      itemCount={notifications.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
`;

// ==================== مثال 10: Service Worker Integration ====================
export const serviceWorkerExample = `
// src/lib/header-service-worker.ts
export async function registerHeaderServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      
      // Cache Header resources
      if (registration.active) {
        await caches.open("header-v1").then((cache) => {
          cache.addAll([
            "/api/navigation",
            "/api/notifications/count",
            "/api/user/profile"
          ]);
        });
      }
      
      return registration;
    } catch (error) {
      logger.error("Service Worker registration failed:", error);
    }
  }
}
`;

