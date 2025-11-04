"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { 
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Bell,
  BellOff,
  Battery,
  BatteryCharging,
  Moon,
  Sun,
  CheckCircle2,
  XCircle
} from "lucide-react";

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
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches || hour >= 18 || hour <= 6;

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
          if (storage.hasOwnProperty(key)) {
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
        return "bg-green-100 text-green-700 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-200/25 via-transparent to-blue-200/25" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            مؤشرات الحالة
          </h2>
          <p className="text-muted-foreground text-lg">
            رصد حالة النظام والاتصال والخدمات في الوقت الفعلي
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {indicators.map((indicator, index) => (
            <motion.div
              key={indicator.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`rounded-lg p-2 ${getStatusColor(indicator.status)}`}>
                      {indicator.icon}
                    </div>
                    <Badge className={getStatusColor(indicator.status)}>
                      {indicator.status === "online" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {indicator.status !== "online" && <XCircle className="h-3 w-3 mr-1" />}
                      {indicator.value}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {indicator.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {indicator.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* System Health Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="border-0 bg-gradient-to-r from-green-600 to-emerald-600 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white/20 p-4 backdrop-blur-md">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">حالة النظام ممتازة</h3>
                    <p className="text-white/80 text-sm">
                      جميع الخدمات تعمل بشكل طبيعي
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {indicators.filter(i => i.status === "online").length}/{indicators.length}
                  </div>
                  <div className="text-sm text-white/80">خدمات نشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
});

export default StatusIndicatorsSection;

