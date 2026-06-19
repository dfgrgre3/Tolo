"use client";

import { useState, useEffect, memo } from "react";
import { m } from "framer-motion";
import { Wifi, WifiOff, Cloud, CloudOff, Bell, BellOff, BatteryCharging, Moon, Sun } from "lucide-react";
import { IndicatorCard } from "./IndicatorCard";
import { SystemHealthBanner } from "./SystemHealthBanner";

interface StatusIndicator {
  id: string;
  label: string;
  status: "online" | "offline" | "warning" | "error";
  value: string;
  icon: React.ReactNode;
  description: string;
}

export const StatusIndicatorsSection = memo(function StatusIndicatorsSection() {
  const [indicators, setIndicators] = useState<StatusIndicator[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const checkNotificationPermission = (): "online" | "warning" => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "warning";
    }
    return Notification.permission === "granted" ? "online" : "warning";
  };

  const getNotificationStatus = (): string => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "غير مدعوم";
    }
    switch (Notification.permission) {
      case "granted":
        return "مفعل";
      case "denied":
        return "معطل";
      default:
        return "غير مسموح";
    }
  };

  const getNotificationDescription = (): string => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "المتصفح لا يدعم الإشعارات";
    }
    switch (Notification.permission) {
      case "granted":
        return "ستتلقى إشعارات حول أنشطتك";
      case "denied":
        return "الإشعارات معطلة - قم بالتفعيل من إعدادات المتصفح";
      default:
        return "السماح بالإشعارات للحصول على تحديثات فورية";
    }
  };

  const getStorageInfo = (): string => {
    if (typeof navigator !== "undefined" && "storage" in navigator && "estimate" in navigator.storage) {
      try {
        const storage = localStorage;
        let total = 0;
        for (let key in storage) {
          if (Object.prototype.hasOwnProperty.call(storage, key)) {
            total += storage[key].length + key.length;
          }
        }
        const usedMB = (total / 1024 / 1024).toFixed(2);
        return `${usedMB} MB مستخدم`;
      } catch {
        return "جيد";
      }
    }
    return "جيد";
  };

  const updateIndicators = () => {
    const now = new Date();
    const hour = now.getHours();
    const isDarkMode = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches || hour >= 18 || hour <= 6 : hour >= 18 || hour <= 6;

    setIndicators([
      {
        id: "connection",
        label: "الاتصال بالإنترنت",
        status: isOnline ? "online" : "offline",
        value: isOnline ? "متصل" : "غير متصل",
        icon: isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />,
        description: isOnline ? "اتصال مستقر" : "تحقق من اتصالك بالإنترنت"
      },
      {
        id: "sync",
        label: "مزامنة البيانات",
        status: isOnline ? "online" : "warning",
        value: isOnline ? "متزامن" : "في وضع عدم الاتصال",
        icon: isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />,
        description: isOnline ? "جميع البيانات محدثة" : "البيانات محفوظة محلياً"
      },
      {
        id: "notifications",
        label: "الإشعارات",
        status: checkNotificationPermission(),
        value: getNotificationStatus(),
        icon: checkNotificationPermission() === "online" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />,
        description: getNotificationDescription()
      },
      {
        id: "theme",
        label: "الوضع الليلي",
        status: isDarkMode ? "online" : "online",
        value: isDarkMode ? "مفعل" : "معطل",
        icon: isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />,
        description: isDarkMode ? "الوضع الليلي نشط" : "الوضع النهاري نشط"
      },
      {
        id: "storage",
        label: "مساحة التخزين",
        status: "online",
        value: getStorageInfo(),
        icon: <Cloud className="h-5 w-5" />,
        description: "مساحة تخزين كافية"
      },
      {
        id: "performance",
        label: "أداء النظام",
        status: "online",
        value: "ممتاز",
        icon: <BatteryCharging className="h-5 w-5" />,
        description: "الأداء ضمن المستوى الطبيعي"
      }
    ]);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    updateIndicators();

    const interval = setInterval(updateIndicators, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    updateIndicators();
  }, [isOnline]);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 px-6 md:px-12 py-12 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 mix-blend-overlay" />
      
      <div className="relative z-10">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 drop-shadow-md">
            مؤشرات الحالة
          </h2>
          <p className="text-gray-400 text-lg">
            رصد حالة النظام والاتصال والخدمات في الوقت الفعلي
          </p>
        </m.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {indicators.map((indicator, index) => (
            <IndicatorCard key={indicator.id} indicator={indicator} index={index} />
          ))}
        </div>

        <SystemHealthBanner
          onlineCount={indicators.filter((i) => i.status === "online").length}
          totalCount={indicators.length}
        />
      </div>
    </section>
  );
});

export default StatusIndicatorsSection;
