"use client";

import { useState, useEffect, memo } from "react";
import { useWebSocket } from "@/contexts/websocket-context";
import { m, AnimatePresence } from "framer-motion";
import { safeFetch } from "@/lib/safe-client-utils";
import { Activity, BookOpen, Bell } from "lucide-react";
import { logger } from "@/lib/logger";
import { rpgCommonStyles } from "../../constants";
import { ActivityCard } from "./ActivityCard";

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

interface ActivityApiItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  read?: boolean;
}

interface ActivitiesApiResponse {
  success?: boolean;
  data?: {
    activities?: ActivityApiItem[];
  };
  activities?: ActivityApiItem[];
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

interface StudySessionsApiResponse {
  data?: StudySession[];
  sessions?: StudySession[];
}

function extractActivities(payload: ActivitiesApiResponse | ActivityApiItem[] | null): ActivityApiItem[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as ActivitiesApiResponse).activities)) return (payload as ActivitiesApiResponse).activities!;
  if (Array.isArray((payload as ActivitiesApiResponse).data?.activities)) return (payload as ActivitiesApiResponse).data!.activities!;
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
  const { socket, isConnected } = useWebSocket();
  const isLive = isConnected;

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await safeFetch<ActivitiesApiResponse | ActivityApiItem[]>(
          '/api/activities/recent?limit=10',
          undefined,
          null
        );

        const items = extractActivities(data);
        if (!error && items.length > 0) {
          const transformed: ActivityItem[] = items.map((item) => ({
            id: item.id,
            type: (item.type?.toLowerCase() as ActivityItem['type']) || 'notification',
            title: item.title || 'تنبيه جديد',
            description: item.description || '',
            timestamp: new Date(item.timestamp || Date.now()),
            icon: <Bell className="h-5 w-5" />,
            color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          }));
          setActivities(transformed);
        } else if (!error && items.length === 0) {
          const sessionsUrl = '/api/study-sessions?limit=5';
          const { data: sessionsData } = await safeFetch<StudySessionsApiResponse | StudySession[]>(
            sessionsUrl,
            undefined,
            null
          );
          const sessions = extractStudySessions(sessionsData);

          if (sessions.length > 0) {
            setActivities(
              sessions.slice(0, 5).map((s) => ({
                id: `session-${s.id}`,
                type: 'study_session' as const,
                title: `جلسة مذاكرة: ${s.subject || s.subjectId || 'عام'}`,
                description: `${s.duration ?? s.durationMin ?? 0} دقيقة من المذاكرة المركزة`,
                timestamp: new Date(s.createdAt || s.startTime || s.timestamp || Date.now()),
                icon: <BookOpen className="h-5 w-5" />,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              }))
            );
          }
        }
      } catch (err) {
        logger.error('Error fetching activities:', err);
      }
    };

    fetchActivities();

    const intervalTime = isConnected ? null : 300000;
    let interval: NodeJS.Timeout | null = null;
    if (intervalTime) {
      interval = setInterval(fetchActivities, intervalTime);
    }

    let handleWsMessage: ((event: MessageEvent) => void) | null = null;
    if (socket) {
      handleWsMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === "notification" ||
            data.type === "refresh_notifications" ||
            data.type === "activity_refresh"
          ) {
            fetchActivities();
          }
        } catch (error) {
          // ignore
        }
      };
      socket.addEventListener("message", handleWsMessage);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (socket && handleWsMessage) {
        socket.removeEventListener("message", handleWsMessage);
      }
    };
  }, [isConnected, socket]);

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
          className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
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
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <ActivityCard key={activity.id} activity={activity} index={index} />
              ))
            ) : (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Activity className="h-10 w-10 text-gray-600" />
                </div>
                <p className="text-xl font-bold text-gray-500 mb-2">لا توجد أنشطة لعرضها حالياً</p>
                <p className="text-sm text-gray-600">ابدأ بمذاكرة دروسك أو حل المهام لتظهر أنشطتك هنا.</p>
              </div>
            )}
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
    </section>
  );
});

export default LiveActivityFeedSection;
