"use client";

import * as React from "react";
import { DashboardSkeleton } from "@/components/admin/ui/loading-skeleton";
import { useQuery } from "@tanstack/react-query";
import { AdminButton } from "@/components/admin/ui/admin-button";
import {
  EnhancedStatsCards,
  QuickStatsRow,
} from "@/components/admin/dashboard/enhanced-stats-cards";
import {
  ActivityFeed,
  UpcomingEvents,
  ProgressOverview,
} from "@/components/admin/dashboard/widgets";
import dynamic from "next/dynamic";
import { DraggableDashboard } from "@/components/admin/dashboard/draggable-dashboard";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";
import { useAuth } from "@/contexts/auth-context";
import { BroadcastModal } from "@/components/admin/broadcast/broadcast-modal";
import { adminFetch } from "@/lib/api/admin-api";

const UserGrowthChart = dynamic(() => import("@/components/admin/dashboard/user-growth-chart").then(mod => mod.UserGrowthChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse bg-white/5 rounded-[2rem] border border-white/10" />
});
const ActivityChart = dynamic(() => import("@/components/admin/dashboard/activity-chart").then(mod => mod.ActivityChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse bg-white/5 rounded-[2rem] border border-white/10" />
});
const ActivityHeatmap = dynamic(() => import("@/components/admin/dashboard/activity-heatmap").then(mod => mod.ActivityHeatmap), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse bg-white/5 rounded-[2rem] border border-white/10" />
});
const DistributionChart = dynamic(() => import("@/components/admin/dashboard/distribution-chart").then(mod => mod.DistributionChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse bg-white/5 rounded-[2rem] border border-white/10" />
});

import { SmartAlerts, generateSmartAlerts } from "@/components/admin/dashboard/smart-alerts";
import { GoalsKPIs } from "@/components/admin/dashboard/goals-kpis";
import { GlobalSearch } from "@/components/admin/dashboard/global-search";
import { QuickFilters } from "@/components/admin/dashboard/advanced-filters";
import { RealtimeNotifications } from "@/components/admin/dashboard/realtime-notifications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Download,
  UserPlus,
  BookOpen,
  FileText,
  Settings,
  Bell,
  Users,
  Target,
  Award,
  Clock,
  Zap,
  Calendar,
  Shield,
  TrendingUp,
  Brain,
  Activity,
  Megaphone,
  LayoutDashboard,
  ClipboardList
} from "lucide-react";
import { AiCommandCenter } from "@/components/admin/dashboard/ai-command-center";
import { useWebSocket } from "@/contexts/websocket-context";

interface DashboardData {
  stats: {
    totalUsers: number;
    totalSubjects: number;
    totalExams: number;
    totalResources: number;
    activeChallenges: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
  trends: {
    userGrowth: number;
    studyTime: number;
  };
  charts: {
    userGrowth: Array<{ month: string; users: number }>;
    activity: Array<{ day: string; sessions: number }>;
  };
  activity: {
    tasksCompleted: number;
    examsTaken: number;
    achievementsEarned: number;
    studyMinutes: number;
  };
  recentActivity: Array<{
    id: string;
    userId: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
    user?: {
      name: string;
      avatar: string;
    };
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    type: "exam" | "challenge" | "announcement";
  }>;
}

const STYLES = {
   glass: "admin-glass p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden",
   glow: "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none",
   card: "admin-card p-6 flex flex-col gap-4",
   statsValue: "text-4xl font-black font-mono tracking-tighter"
};

const quickActionsConfig = [
  { title: "إضافة مستخدم", icon: UserPlus, href: "/admin/users?action=new", color: "blue" },
  { title: "مادة جديدة", icon: BookOpen, href: "/admin/subjects?action=new", color: "green" },
  { title: "إنشاء اختبار", icon: FileText, href: "/admin/exams?action=new", color: "purple" },
  { title: "مهمة جديدة", icon: ClipboardList, href: "/admin/challenges?action=new", color: "orange" },
  { title: "الإعدادات", icon: Settings, href: "/admin/settings", color: "gray" },
  { title: "تنبيه عام", icon: Bell, href: "/admin/notifications?action=new", color: "rose" },
];

export default function AdminDashboardPage() {
  const { playSound } = usePremiumSounds();
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = React.useState("today");
  const { lastMessage } = useWebSocket();
  const [isBroadcastOpen, setIsBroadcastOpen] = React.useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["admin-dashboard", timeFilter],
    queryFn: async () => {
      const response = await adminFetch(`dashboard?time=${timeFilter}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const json = await response.json();
      return json.data || json;
    },
  });

  const handleRefresh = React.useCallback(() => {
    playSound("click");
    refetch();
  }, [playSound, refetch]);

  if (isLoading) return <DashboardSkeleton />;
  if (!data) return <div>No data found</div>;

  const safeStats = data.stats || { totalUsers: 0, totalSubjects: 0, totalExams: 0, totalResources: 0, activeChallenges: 0, newUsersToday: 0, newUsersThisWeek: 0 };
  const safeTrends = data.trends || { userGrowth: 0, studyTime: 0 };
  const safeActivity = data.activity || { tasksCompleted: 0, examsTaken: 0, achievementsEarned: 0, studyMinutes: 0 };
  const safeRecentActivity = data.recentActivity || [];
  const safeUpcomingEvents = data.upcomingEvents || [];
  const safeCharts = data.charts || {
    userGrowth: [],
    activity: []
  };

  const sections = [
    {
      id: "quick-actions",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
           {quickActionsConfig.map((action, i) => (
             <a
               key={i}
               href={action.href}
               onMouseEnter={() => playSound('hover')}
               onClick={() => playSound('click')}
               className={STYLES.glass + " p-6 flex flex-col items-center justify-center gap-4 group hover:border-primary/50 transition-all"}
             >
                <div className={`p-4 rounded-2xl bg-${action.color}-500/10 text-${action.color}-500 border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                   <action.icon className="w-7 h-7" />
                </div>
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{action.title}</span>
             </a>
           ))}
        </div>
      )
    },
    {
      id: "quick-stats",
      content: (
        <QuickStatsRow stats={[
          { label: "ساعة دراسة مجمعة", value: Math.round(safeActivity.studyMinutes / 60), icon: Clock, color: "blue" },
          { label: "مهمة مكتملة", value: safeActivity.tasksCompleted, icon: Target, color: "green" },
          { label: "إنجاز تعليمي", value: safeActivity.achievementsEarned, icon: Award, color: "yellow" },
          { label: "اختبار تم أداؤه", value: safeActivity.examsTaken, icon: FileText, color: "purple" },
        ]} />
      )
    },
    {
      id: "main-stats",
      content: (
        <EnhancedStatsCards stats={[
          {
            title: "إجمالي المستخدمين",
            value: safeStats.totalUsers,
            description: `${safeStats.newUsersToday} مستخدم جديد اليوم`,
            icon: Users,
            color: "blue",
          },
          {
            title: "المواد الدراسية",
            value: safeStats.totalSubjects,
            description: "مادة مفعلة حالياً",
            icon: BookOpen,
            color: "green",
          },
          {
            title: "إجمالي الاختبارات",
            value: safeStats.totalExams,
            description: `${safeActivity.examsTaken} محاولة اختبار`,
            icon: Target,
            color: "purple",
          },
          {
            title: "المهام النشطة",
            value: safeStats.activeChallenges,
            description: "مهمة قيد التنفيذ حالياً",
            icon: ClipboardList,
            color: "orange",
          },
        ]} animated={false} />
      )
    },
    {
      id: "command-center",
      content: <AiCommandCenter />
    },
    {
       id: "intelligence",
       content: (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-3 space-y-8">
              <div className="flex flex-wrap items-center gap-6">
                <GlobalSearch 
                  placeholder="ابحث في المستخدمين، المواد، الاختبارات..."
                  className="flex-1 min-w-[300px] h-16 rounded-2xl bg-card border border-border text-foreground font-bold focus:border-primary/50"
                  onFocus={() => playSound('hover')}
                />
                <QuickFilters
                  filters={[
                    { id: "today", label: "اليوم", icon: Clock, active: timeFilter === "today", onClick: () => { playSound('click'); setTimeFilter("today"); } },
                    { id: "week", label: "هذا الأسبوع", icon: Calendar, active: timeFilter === "week", onClick: () => { playSound('click'); setTimeFilter("week"); } },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={STYLES.glass}>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black flex items-center gap-2">
                       <TrendingUp className="h-5 w-5 text-primary" />
                       <span>نمو المنصة</span>
                    </h3>
                  </div>
                  <UserGrowthChart data={safeCharts.userGrowth} />
                </div>
                <div className={STYLES.glass}>
                   <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black flex items-center gap-2">
                       <Zap className="h-5 w-5 text-amber-500" />
                       <span>نشاط المستخدمين</span>
                    </h3>
                  </div>
                  <ActivityChart data={safeCharts.activity} />
                </div>
              </div>

              <div className={STYLES.glass}>
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-black">نشاط المنصة الأخير</h3>
                </div>
                <ActivityFeed activities={safeRecentActivity} />
              </div>
           </div>

           <div className="space-y-8">
              <div className={STYLES.glass + " border-primary/20"}>
                 <div className="flex items-center gap-3 mb-8">
                    <Calendar className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-black">الأحداث القادمة</h3>
                 </div>
                 <UpcomingEvents events={safeUpcomingEvents} />
                 {safeUpcomingEvents.length === 0 && (
                   <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">لا توجد فعاليات مجدولة</p>
                   </div>
                 )}
              </div>

              <GoalsKPIs 
                goals={[
                  { id: "1", title: "مستخدمين جدد", current: safeStats.newUsersThisWeek, target: 1000, unit: "مستخدم" },
                  { id: "2", title: "دراسة مجمعة", current: Math.round(safeActivity.studyMinutes / 60), target: 5000, unit: "ساعة" },
                ]}
              />

              <div className="bg-card/50 p-8 rounded-[2.5rem] border border-primary/10 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                 <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                    <Megaphone className="w-12 h-12 text-primary" />
                    <h4 className="font-black text-lg">مركز الإشعارات العام</h4>
                    <p className="text-xs text-gray-400 font-medium">إرسال تنبيه إداري عاجل لكافة المستخدمين والطلاب.</p>
                    <AdminButton 
                      variant="premium" 
                      className="w-full rounded-2xl h-12"
                      onClick={() => setIsBroadcastOpen(true)}
                    >
                      إرسال بث تنبيهي
                    </AdminButton>
                 </div>
              </div>
           </div>
        </div>
       )
    }
  ];

  return (
    <div className="space-y-12 pb-20" dir="rtl">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">لوحة التحكم الإدارية</h1>
          <p className="text-gray-400 font-medium">مرحباً بك، {user?.name || "المسؤول"}. إليك نظرة شاملة على مستجدات المنصة التعليمية.</p>
        </div>
        <div className="flex items-center gap-4">
           <AdminButton
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              loading={isFetching}
              icon={RefreshCw}
              className="h-14 px-8 rounded-2xl"
            >
              تحديث البيانات
            </AdminButton>
            <RealtimeNotifications />
        </div>
      </header>

      <DraggableDashboard children={sections} onOrderChange={() => {}} />

      <BroadcastModal 
        open={isBroadcastOpen} 
        onOpenChange={setIsBroadcastOpen}
        users={[]} 
      />
    </div>
  );
}
