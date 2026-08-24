"use client";

import { useState, useEffect, memo, useCallback } from "react";
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

  /** Reads the real storage quota usage reported by the browser. */
  const [storage, setStorage] = useState<{ value: string; status: "online" | "warning"; description: string }>({
    value: "جارٍ القياس",
    status: "online",
    description: "قياس المساحة المستخدمة",
  });

  /** Measures actual page load duration from the Navigation Timing API. */
  const [performanceInfo, setPerformanceInfo] = useState<{ value: string; status: "online" | "warning"; description: string }>({
    value: "جارٍ القياس",
    status: "online",
    description: "قياس زمن تحميل الصفحة",
  });

  const updateIndicators = useCallback(() => {
    const isDarkMode =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark");

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
        label: "المظهر",
        status: "online",
        value: isDarkMode ? "ليلي" : "نهاري",
        icon: isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />,
        description: isDarkMode ? "الوضع الليلي نشط" : "الوضع النهاري نشط"
      },
      {
        id: "storage",
        label: "مساحة التخزين",
        status: storage.status,
        value: storage.value,
        icon: <Cloud className="h-5 w-5" />,
        description: storage.description
      },
      {
        id: "performance",
        label: "زمن التحميل",
        status: performanceInfo.status,
        value: performanceInfo.value,
        icon: <BatteryCharging className="h-5 w-5" />,
        description: performanceInfo.description
      }
    ]);
  }, [isOnline, storage, performanceInfo]);

  // Measure storage quota and page load time once, from real browser APIs.
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
        const usedMB = usage / 1024 / 1024;
        const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
        setStorage({
          value: `${usedMB.toFixed(1)} MB`,
          status: percentUsed > 80 ? "warning" : "online",
          description: quota > 0
            ? `${percentUsed.toFixed(1)}% من المساحة المتاحة للمتصفح`
            : "المساحة المستخدمة محلياً",
        });
      }).catch(() => {
        setStorage({ value: "غير متاح", status: "warning", description: "المتصفح لا يوفر بيانات التخزين" });
      });
    } else {
      setStorage({ value: "غير متاح", status: "warning", description: "المتصفح لا يوفر بيانات التخزين" });
    }

    const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navigation) {
      const loadSeconds = navigation.duration / 1000;
      setPerformanceInfo({
        value: `${loadSeconds.toFixed(2)} ث`,
        status: loadSeconds > 3 ? "warning" : "online",
        description: loadSeconds > 3 ? "التحميل أبطأ من المعتاد" : "زمن تحميل الصفحة الفعلي",
      });
    } else {
      setPerformanceInfo({ value: "غير متاح", status: "warning", description: "لا تتوفر قياسات الأداء" });
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    updateIndicators();
    const interval = window.setInterval(updateIndicators, 30000);
    return () => window.clearInterval(interval);
  }, [updateIndicators]);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 !bg-black/70 px-6 md:px-12 py-12 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 mix-blend-overlay" />
      
      <div className="relative z-10">
        <div
          className="mb-8 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 drop-shadow-md">
            مؤشرات الحالة
          </h2>
          <p className="text-gray-200 text-lg">
            رصد حالة النظام والاتصال والخدمات في الوقت الفعلي
          </p>
        </div>

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
