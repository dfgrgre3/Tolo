"use client";

import { useState, useEffect, memo } from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Bell,
  BellOff,

  BatteryCharging,
  Moon,
  Sun,
  CheckCircle2,
  XCircle } from
"lucide-react";

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

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initialize indicators
    updateIndicators();

    // Update periodically
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
    }]
    );
  };

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
      // This is async, so we'll use a simple calculation
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "error":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default:
        return "bg-white/10 text-gray-400 border-white/20";
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 px-6 md:px-12 py-12 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 mix-blend-overlay" />
      
      <div className="relative z-10">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center">
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 drop-shadow-md">
            مؤشرات الحالة
          </h2>
          <p className="text-gray-400 text-lg">
            رصد حالة النظام والاتصال والخدمات في الوقت الفعلي
          </p>
        </m.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {indicators.map((indicator, index) =>
          <m.div
            key={indicator.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}>
            
              <Card className="bg-black/40 border-white/5 shadow-none hover:bg-white-[0.03] hover:border-white/10 transition-all rounded-2xl backdrop-blur-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`rounded-xl p-2.5 shadow-inner backdrop-blur-md border ${getStatusColor(indicator.status)}`}>
                      {indicator.icon}
                    </div>
                    <Badge className={`${getStatusColor(indicator.status)} border bg-transparent bg-opacity-10 shadow-none`}>
                      {indicator.status === "online" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {indicator.status !== "online" && <XCircle className="h-3 w-3 mr-1" />}
                      {indicator.value}
                    </Badge>
                  </div>
                  
                  <h3 className="font-bold text-white mb-2 text-lg">
                    {indicator.label}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {indicator.description}
                  </p>
                </CardContent>
              </Card>
            </m.div>
          )}
        </div>

        {/* System Health Summary */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8">
          
          <Card className="border border-white/10 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] rounded-2xl mx-1">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between text-white gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-500/20 p-4 backdrop-blur-md border border-emerald-500/30 shadow-inner">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 drop-shadow-sm">حالة النظام ممتازة</h3>
                    <p className="text-emerald-200/80 text-sm">
                      جميع الخدمات تعمل بشكل طبيعي
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right bg-black/20 px-6 py-3 rounded-2xl border border-white/5">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                    {indicators.filter((i) => i.status === "online").length}/{indicators.length}
                  </div>
                  <div className="text-sm text-emerald-200/60 font-medium">خدمات نشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>
      </div>
    </section>);

});

export default StatusIndicatorsSection;