"use client";

import { useState, useEffect, memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeFetch } from "@/lib/safe-client-utils";
import { getSafeUserId } from "@/lib/safe-client-utils";
import {
  Activity,
  Clock,


  BookOpen,




  Bell } from
"lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { logger } from '@/lib/logger';
import { rpgCommonStyles } from "../constants";

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

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  description?: string;
  createdAt?: string | Date;
  timestamp?: string | Date;
  userId?: string;
}

interface StudySession {
  id: string;
  subject?: string;
  subjectId?: string;
  duration?: number;
  durationMin?: number;
  startTime?: string | Date;
  createdAt?: string | Date;
  timestamp?: string | Date;
}

interface NotificationsApiResponse {
  data?: {
    notifications?: Notification[];
  };
  notifications?: Notification[];
}

interface StudySessionsApiResponse {
  data?: StudySession[];
  sessions?: StudySession[];
}

function extractNotifications(payload: NotificationsApiResponse | Notification[] | null): Notification[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.notifications)) return payload.notifications;
  if (Array.isArray(payload.data?.notifications)) return payload.data.notifications;
  return [];
}

function extractStudySessions(payload: StudySessionsApiResponse | StudySession[] | null): StudySession[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.sessions)) return payload.sessions;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export const LiveActivityFeedSection = memo(function LiveActivityFeedSection() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive,,] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const userId = getSafeUserId();

      try {
        const notificationsUrl = userId ?
        `/api/notifications?userId=${encodeURIComponent(userId)}` :
        '/api/notifications';

        const { data, error } = await safeFetch<NotificationsApiResponse | Notification[]>(
          notificationsUrl,
          undefined,
          null
        );

        const notifications = extractNotifications(data);
        if (!error && notifications.length > 0) {
          const transformedActivities = notifications.map((notification) => ({
            id: notification.id || `activity-${Date.now()}-${Math.random()}`,
            type: notification.type as ActivityItem['type'] || "notification",
            title: notification.title || "تنبيه جديد",
            description: notification.message || notification.description || "",
            timestamp: new Date(notification.createdAt || notification.timestamp || Date.now()),
            icon: <Bell className="h-5 w-5" />,
            color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
            user: notification.userId
          }));

          setActivities(transformedActivities);
        } else {
          // If there's a network error (like Failed to fetch), don't attempt the second request
          if (error && (error.message.includes('Failed to fetch') || error.name === 'AbortError')) {
            if (activities.length === 0) setActivities([]);
            return;
          }

          const sessionsUrl = userId ?
          `/api/study-sessions?userId=${encodeURIComponent(userId)}` :
          '/api/study-sessions';

          const { data: sessionsData } = await safeFetch<StudySessionsApiResponse | StudySession[]>(
            sessionsUrl,
            undefined,
            null
          );
          const sessions = extractStudySessions(sessionsData);

          if (sessions.length > 0) {
            const sessionActivities = sessions.slice(0, 5).map((session) => ({
              id: `session-${session.id}`,
              type: "study_session" as const,
              title: `جلسة مذاكرة: ${session.subject || session.subjectId || 'عام'}`,
              description: `${session.duration ?? session.durationMin ?? 0} دقيقة من المذاكرة المركزة`,
              timestamp: new Date(session.createdAt || session.startTime || session.timestamp || Date.now()),
              icon: <BookOpen className="h-5 w-5" />,
              color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            }));

            setActivities(sessionActivities);
          }
        }
      } catch (error) {
        logger.error("Error fetching activities:", error);
        setActivities([]);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);


  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: ar });
    } catch {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return "منذ قليل";
      if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
      if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
      return `منذ ${Math.floor(seconds / 86400)} يوم`;
    }
  };

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-16 shadow-2xl relative overflow-hidden group/activity`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 opacity-30 group-hover/activity:opacity-50 transition-opacity duration-1000" />
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none group-hover/activity:scale-110 transition-transform duration-1000" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-2xl blur-lg animate-pulse" />
              <div className="relative rounded-2xl bg-black/40 p-4 ring-2 ring-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div>
              <h2 className={`text-4xl md:text-5xl font-black tracking-tight ${rpgCommonStyles.neonText} mb-2`}>
                نشاطك المباشر الآن
              </h2>
              <p className="text-gray-400 text-lg font-medium border-r-4 border-blue-500/30 pr-4">
                تحديثات حية لنشاطك الدراسي ومهامك الملحمية.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 self-start md:self-auto px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-inner group-hover/activity:border-blue-500/30 transition-colors">
            <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`} />
            <span className="text-sm font-black text-gray-300 tracking-wider">
              {isLive ? "متصل الآن (ONLINE)" : "غير متصل (OFFLINE)"}
            </span>
          </div>
        </m.div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          <AnimatePresence>
            {activities.length > 0 ? activities.map((activity, index) =>
            <m.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              layout>
              
                <Card className="bg-black/40 border-white/5 shadow-2xl hover:bg-white/5 hover:border-blue-500/30 transition-all duration-500 group/item relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover/item:animate-shimmer" />
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className={`flex-shrink-0 rounded-2xl p-4 border ${activity.color} transition-all duration-500 group-hover/item:scale-110 group-hover/item:rotate-3 shadow-xl relative z-10`}>
                        {activity.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-black text-gray-100 text-xl group-hover/item:text-blue-400 transition-colors">
                            {activity.title}
                          </h3>
                          <span className="flex-shrink-0 text-xs font-bold text-gray-500 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Clock className="h-3 w-3 text-blue-400" />
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-base mb-6 leading-relaxed line-clamp-2 group-hover/item:text-gray-300 transition-colors">
                          {activity.description}
                        </p>

                        <div className="flex items-center gap-3">
                          <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-[0.2em] font-black border-white/10 bg-white/5 text-gray-400 px-3 py-1">
                          
                            {activity.type === "achievement" && "إنجاز ملحمي (Epic Achievement)"}
                            {activity.type === "task_completed" && "تم إكمال المهمة (Quest Clear)"}
                            {activity.type === "study_session" && "جلسة مذاكرة (Training Log)"}
                            {activity.type === "milestone" && "إنجاز مرحلي (Level Milestone)"}
                            {activity.type === "notification" && "تنبيه النظام (System Alert)"}
                          </Badge>
                          {index === 0 &&
                        <Badge className="text-[10px] uppercase font-black px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                              جديد (NEW)
                            </Badge>
                        }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </m.div>
            ) : !activities.length &&
            <div className="text-center py-20 flex flex-col items-center">
                 <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                   <Activity className="h-10 w-10 text-gray-600" />
                 </div>
                 <p className="text-xl font-bold text-gray-500 mb-2">لا توجد أنشطة لعرضها حالياً</p>
                 <p className="text-sm text-gray-600">ابدأ بمذاكرة دروسك أو حل المهام لتظهر أنشطتك هنا.</p>
              </div>
            }
          </AnimatePresence>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </section>);

});

export default LiveActivityFeedSection;