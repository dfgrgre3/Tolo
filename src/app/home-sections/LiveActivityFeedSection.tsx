"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { safeFetch } from "@/lib/safe-client-utils";
import { getSafeUserId } from "@/lib/safe-client-utils";
import { 
  Activity,
  Clock,
  CheckCircle2,
  Trophy,
  BookOpen,
  Users,
  Zap,
  TrendingUp,
  MessageSquare,
  Bell
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
// Note: Arabic locale may not be available in all date-fns versions
// Fallback to English if Arabic locale is not found

interface ActivityItem {
  id: string;
  type: "achievement" | "task_completed" | "exam_finished" | "study_session" | "milestone" | "notification";
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
  user?: string;
}

export const LiveActivityFeedSection = memo(function LiveActivityFeedSection() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const userId = getSafeUserId();
      
      try {
        // Fetch real activities from API
        const { data, error } = await safeFetch<ActivityItem[]>(
          `/api/notifications${userId ? `?userId=${userId}` : ''}`,
          undefined,
          []
        );

        if (!error && data && data.length > 0) {
          // Transform API data to ActivityItem format
          const transformedActivities = data.map((notification: any) => ({
            id: notification.id || `activity-${Date.now()}-${Math.random()}`,
            type: notification.type || "notification",
            title: notification.title || "إشعار جديد",
            description: notification.message || notification.description || "",
            timestamp: new Date(notification.createdAt || notification.timestamp || Date.now()),
            icon: <Bell className="h-5 w-5" />,
            color: "text-blue-600 bg-blue-100",
            user: notification.userId
          }));

          setActivities(transformedActivities);
        } else {
          // If no notifications, try to get study sessions
          const { data: sessionsData } = await safeFetch<any[]>(
            `/api/study-sessions${userId ? `?userId=${userId}` : ''}`,
            undefined,
            []
          );

          if (sessionsData && sessionsData.length > 0) {
            const sessionActivities = sessionsData.slice(0, 5).map((session: any) => ({
              id: `session-${session.id}`,
              type: "study_session" as const,
              title: `جلسة دراسة: ${session.subject || 'عام'}`,
              description: `${session.duration || 0} دقيقة من الدراسة`,
              timestamp: new Date(session.createdAt || session.timestamp || Date.now()),
              icon: <BookOpen className="h-5 w-5" />,
              color: "text-blue-600 bg-blue-100"
            }));

            setActivities(sessionActivities);
          }
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        // Keep empty array instead of showing fake data
        setActivities([]);
      }
    };

    fetchActivities();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchActivities, 30000);

    return () => clearInterval(interval);
  }, []);


  const formatTime = (date: Date) => {
    try {
      // Try to use Arabic locale, fallback to English
      try {
        const { ar } = require("date-fns/locale");
        return formatDistanceToNow(date, { addSuffix: true, locale: ar });
      } catch {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    } catch {
      // Fallback to relative time in Arabic
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return "منذ لحظات";
      if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
      if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
      return `منذ ${Math.floor(seconds / 86400)} يوم`;
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200/25 via-transparent to-cyan-200/25" />
      
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 p-3">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">
                سجل النشاط المباشر
              </h2>
            </div>
            <p className="text-muted-foreground text-lg">
              تابع أحدث أنشطتك وإنجازاتك لحظة بلحظة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {isLive ? "مباشر" : "غير متصل"}
            </span>
          </div>
        </motion.div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          <AnimatePresence>
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 rounded-xl p-3 ${activity.color} transition-transform group-hover:scale-110`}>
                        {activity.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 text-base">
                            {activity.title}
                          </h3>
                          <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {activity.description}
                        </p>

                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-xs border-slate-200"
                          >
                            {activity.type === "achievement" && "إنجاز"}
                            {activity.type === "task_completed" && "مهمة مكتملة"}
                            {activity.type === "study_session" && "جلسة دراسة"}
                            {activity.type === "milestone" && "معلم"}
                            {activity.type === "notification" && "إشعار"}
                          </Badge>
                          {index === 0 && (
                            <Badge className="text-xs bg-blue-600 text-white">
                              جديد
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {activities.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد أنشطة حديثة</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </section>
  );
});

export default LiveActivityFeedSection;

