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
import { m } from "framer-motion";
import { SystemPulse } from "@/components/admin/dashboard/system-pulse";
import { DraggableDashboard } from "@/components/admin/dashboard/draggable-dashboard";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";
import { useAuth } from "@/contexts/auth-context";

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
  Trophy,
  Settings,
  Bell,
  Users,
  Target,
  Award,
  Clock,
  Zap,
  Calendar,
  Shield,
  Crown,
  Map,
  Compass,
  TrendingUp
} from "lucide-react";
import { AiCommandCenter } from "@/components/admin/dashboard/ai-command-center";

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
    type: string;
    id: string;
    time: Date;
    title: string | null;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    startDate: Date;
    location: string | null;
  }>;
}

type TimeFilter = "today" | "week" | "month" | "year";

const timeFilterLabels: Record<TimeFilter, string> = {
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  year: "هذا العام",
};

const STYLES = {
  glass: "rpg-glass-light dark:rpg-glass p-8 md:p-12",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

const quickActionsConfig = [
  { title: "إضافة مستخدم", href: "/admin/users", icon: UserPlus, color: "blue" as const, permission: "USERS_MANAGE" },
  { title: "إضافة مادة", href: "/admin/subjects", icon: BookOpen, color: "green" as const, permission: "SUBJECTS_MANAGE" },
  { title: "إضافة امتحان", href: "/admin/exams", icon: FileText, color: "purple" as const, permission: "EXAMS_MANAGE" },
  { title: "إضافة تحدي", href: "/admin/challenges", icon: Trophy, color: "orange" as const, permission: "CHALLENGES_MANAGE" },
  { title: "إعلان جديد", href: "/admin/announcements", icon: Bell, color: "cyan" as const, permission: "ANNOUNCEMENTS_MANAGE" },
  { title: "الإعدادات", href: "/admin/settings", icon: Settings, color: "pink" as const, permission: "SETTINGS_MANAGE" },
];

// Default values for dashboard data
const defaultStats = {
  totalUsers: 0,
  totalSubjects: 0,
  totalExams: 0,
  totalResources: 0,
  activeChallenges: 0,
  newUsersToday: 0,
  newUsersThisWeek: 0,
};

const defaultTrends = {
  userGrowth: 0,
  studyTime: 0,
};

const defaultCharts = {
  userGrowth: [] as Array<{ month: string; users: number }>,
  activity: [] as Array<{ day: string; sessions: number }>,
};

const defaultActivity = {
  tasksCompleted: 0,
  examsTaken: 0,
  achievementsEarned: 0,
  studyMinutes: 0,
};

export default function AdminDashboardPage() {
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("week");
  const { playSound } = usePremiumSounds();
  const { fetchWithAuth } = useAuth();
  
  // Persistence for layout
  const [widgetOrder, setWidgetOrder] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    const savedOrder = localStorage.getItem('admin_dashboard_layout');
    if (savedOrder) {
      try {
        setWidgetOrder(JSON.parse(savedOrder));
      } catch (err: unknown) {
        // Layout order not present or malformed
        console.error(err instanceof Error ? err.message : String(err));
      }
    }
  }, []);

  const handleOrderChange = (newOrder: string[]) => {
    localStorage.setItem('admin_dashboard_layout', JSON.stringify(newOrder));
    setWidgetOrder(newOrder);
  };

  const { data, isLoading: loading, error: queryError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'dashboard', timeFilter],
    queryFn: async () => {
      const response = await fetchWithAuth(`/api/admin/dashboard?period=${timeFilter}`);
      const dashboardData = await response.json();
      if (!response.ok) {
        throw new Error(dashboardData.error || "Failed to fetch dashboard data");
      }
      
      return dashboardData as DashboardData;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const error = queryError ? (queryError as Error).message : null;
  const refreshing = isFetching;

  const handleRefresh = () => {
    playSound('transition');
    refetch();
  };

  const handleExport = () => {
    if (data) {
      playSound('success');
      const safeStats = data.stats || defaultStats;
      const safeActivity = data.activity || defaultActivity;
      const exportData = {
        period: timeFilter,
        stats: safeStats,
        activity: safeActivity,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-export-${timeFilter}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const notifications = React.useMemo(() => [
    { id: "1", type: "user" as const, title: "محارب جديد", description: "انضم أحمد محمد إلى المملكة", timestamp: new Date(1711280000000), read: false },
    { id: "2", type: "activity" as const, title: "حملة مكثفة", description: "تم استرداد 50 مخطوطة اليوم", timestamp: new Date(1711270000000), read: false },
    { id: "3", type: "achievement" as const, title: "ترقية رتبة", description: "تم منح 10 أوسمة بسالة", timestamp: new Date(1711260000000), read: true },
  ], []);

  const dashboardNotifications = React.useMemo(() => {
    if (!data) {
      return notifications;
    }

    const recentActivity = data.recentActivity || [];
    return recentActivity.slice(0, 6).map((item, index) => {
      const notificationType =
        item.type === "user" || item.type === "achievement"
          ? (item.type as "user" | "achievement")
          : ("activity" as const);

      const titles: Record<string, string> = {
        user: "مستخدم جديد انضم إلى المنصة",
        exam: "تم تسجيل نتيجة اختبار جديدة",
        achievement: "تم منح إنجاز جديد",
        challenge: item.title || "تم تحديث أحد التحديات",
      };

      return {
        id: `${item.type}-${item.id}`,
        type: notificationType,
        title: titles[item.type] || "نشاط جديد في لوحة التحكم",
        description: item.title || `تم تسجيل ${item.type} جديد في قاعدة البيانات`,
        timestamp: new Date(item.time),
        read: index > 1,
      };
    });
  }, [data, notifications]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 bg-card text-card-foreground p-10 rounded-[3rem] border border-destructive/20 shadow-2xl">
        <div className="p-6 bg-red-500/10 rounded-full border border-red-500/30 text-red-500 animate-pulse">
          <Shield className="h-16 w-16" />
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black">تعثر استدعاء السجلات</h2>
          <p className="text-gray-400 font-medium max-w-md">{error || "لا يمكن دجلب بيانات المحاريب حالياً"}</p>
        </div>
        <AdminButton variant="outline" onClick={handleRefresh} icon={RefreshCw} className="h-14 px-10 rounded-2xl font-black border-white/10 hover:bg-white/5">
          إعادة الاستدعاء
        </AdminButton>
      </div>
    );
  }

  // Create safe data with defaults for missing properties
  const safeStats = data.stats || defaultStats;
  const safeTrends = data.trends || defaultTrends;
  const safeCharts = data.charts || defaultCharts;
  const safeActivity = data.activity || defaultActivity;
  const safeRecentActivity = data.recentActivity || [];
  const safeUpcomingEvents = data.upcomingEvents || [];

  const sections = [
    {
      id: "quick-actions",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
           {quickActionsConfig.map((action, i) => (
             <m.a
               key={i}
               href={action.href}
               whileHover={{ scale: 1.02 }}
               onMouseEnter={() => playSound('hover')}
               onClick={() => playSound('click')}
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: i * 0.05 }}
               className={STYLES.glass + " p-6 flex flex-col items-center justify-center gap-4 group hover:border-primary/50 transition-all"}
             >
                <div className={`p-4 rounded-2xl bg-${action.color}-500/10 text-${action.color}-500 border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                   <action.icon className="w-7 h-7" />
                </div>
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{action.title}</span>
             </m.a>
           ))}
        </div>
      )
    },
    {
      id: "quick-stats",
      content: (
        <QuickStatsRow stats={[
          { label: "ساعة دراسة مجمعة", value: Math.round(safeActivity.studyMinutes / 60), icon: Clock, color: "blue" },
          { label: "مبارزة مكتملة", value: safeActivity.tasksCompleted, icon: Target, color: "green" },
          { label: "وسام مكتسب", value: safeActivity.achievementsEarned, icon: Award, color: "yellow" },
          { label: "مخطوطة سجل", value: safeActivity.examsTaken, icon: FileText, color: "purple" },
        ]} />
      )
    },
    {
      id: "main-stats",
      content: (
        <EnhancedStatsCards stats={[
          {
            title: "إجمالي المحاربين",
            value: safeStats.totalUsers,
            description: `${safeStats.newUsersToday} وافد جديد اليوم`,
            icon: Users,
            color: "blue",
            trend: safeTrends.userGrowth ? {
              value: safeTrends.userGrowth,
              isPositive: safeTrends.userGrowth > 0,
            } : undefined,
          },
          {
            title: "المخطوطات العلمية",
            value: safeStats.totalSubjects,
            description: "مادة متاحة حالياً",
            icon: BookOpen,
            color: "green",
          },
          {
            title: "الاختبارات الملكية",
            value: safeStats.totalExams,
            description: `${safeActivity.examsTaken} اختباراً تم اجتيازه`,
            icon: Target,
            color: "purple",
          },
          {
            title: "الحملات النشطة",
            value: safeStats.activeChallenges,
            description: "تحدي عسكري جاري",
            icon: Trophy,
            color: "orange",
          },
        ]} animated />
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
                  placeholder="ابحث في سجلات السمان، المواد، البطولات..."
                  className="flex-1 min-w-[300px] h-16 rounded-2xl bg-card border border-border text-foreground font-bold focus:border-primary/50"
                  onFocus={() => playSound('hover')}
                />
                <QuickFilters
                  filters={[
                    { id: "today", label: "سجلات اليوم", icon: Compass, active: timeFilter === "today", onClick: () => { playSound('click'); setTimeFilter("today"); } },
                    { id: "week", label: "حملة الأسبوع", icon: Map, active: timeFilter === "week", onClick: () => { playSound('click'); setTimeFilter("week"); } },
                    { id: "month", label: "حصاد الشهر", icon: Calendar, active: timeFilter === "month", onClick: () => { playSound('click'); setTimeFilter("month"); } },
                  ]}
                />
              </div>

              <SmartAlerts
                alerts={generateSmartAlerts({
                  users: { total: safeStats.totalUsers, new: safeStats.newUsersThisWeek, active: safeStats.newUsersToday },
                  content: { subjects: safeStats.totalSubjects, exams: safeStats.totalExams, resources: safeStats.totalResources },
                  activity: { studySessions: safeActivity.studyMinutes, tasksCompleted: safeActivity.tasksCompleted },
                  trends: { userGrowth: safeTrends.userGrowth, studyTime: safeTrends.studyTime },
                })}
                title="تنبيهات الاستخبارات الملكية"
              />

              {/* Charts Grid */}
              <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                 <div className={STYLES.glass + " p-8 h-[450px]"}>
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-black flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <span>نمو جيش المملكة</span>
                       </h3>
                    </div>
                    <UserGrowthChart data={safeCharts.userGrowth} />
                 </div>
                 <div className={STYLES.glass + " p-8 h-[450px]"}>
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-black flex items-center gap-3">
                          <Zap className="w-5 h-5 text-amber-500" />
                          <span>نشاط ساحة القتال</span>
                       </h3>
                    </div>
                    <ActivityChart data={safeCharts.activity} />
                 </div>
              </div>
           </div>

           {/* Side Widgets */}
           <div className="space-y-8">
              <SystemPulse />

              <RealtimeNotifications
                notifications={dashboardNotifications}
                isConnected={true}
              />

              <ProgressOverview
                items={[
                  { id: "1", label: "تجنيد (أسبوعي)", current: safeStats.newUsersThisWeek, target: 100, color: "blue" },
                  { id: "2", label: "تكتيك (مهام)", current: safeActivity.tasksCompleted, target: 500, color: "green" },
                  { id: "3", label: "فروسية (أوسمة)", current: safeActivity.achievementsEarned, target: 200, color: "yellow" },
                ]}
                title="مؤشرات القدرة القتالية"
              />
           </div>
        </div>
       )
    },
    {
      id: "tactical-maps",
      content: (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className={STYLES.glass + " p-8"}>
             <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-gray-500">توزيع الرتب العسكرية</h3>
             <DistributionChart
               data={[
                 { name: "طلاب", value: Math.round(safeStats.totalUsers * 0.7), color: "#3b82f6" },
                 { name: "معلمين", value: Math.round(safeStats.totalUsers * 0.2), color: "#10b981" },
                 { name: "إداريين", value: Math.round(safeStats.totalUsers * 0.1), color: "#8b5cf6" },
               ]}
               title="توزيع الفئات"
               description="حسب الدور والمنصب"
             />
          </div>

          <div className={STYLES.glass + " p-8 col-span-1 lg:col-span-2"}>
             <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-gray-500">خارطة التحركات الزمنية</h3>
             <div className="h-[300px]">
                <ActivityHeatmap
                  data={safeCharts.activity.map((item: { day: string; sessions: number }) => ({
                    date: item.day,
                    count: item.sessions,
                  }))}
                  title="خريطة النشاط"
                  color="green"
                />
             </div>
          </div>
        </div>
      )
    },
    {
      id: "strategy-hall",
      content: (
        <div className="grid gap-8 lg:grid-cols-3">
           <div className="lg:col-span-2">
              <GoalsKPIs
                goals={[
                  { id: "1", title: "اتساع المملكة", description: "الوصول إلى 1000 محارب", current: safeStats.totalUsers, target: 1000, unit: "محارب", category: "users", priority: "high" },
                  { id: "2", title: "كفاءة التدريب", current: safeActivity.tasksCompleted, target: 500, unit: "تدريب", category: "engagement", priority: "medium" },
                  { id: "3", title: "سجلات الإنجاز", current: safeActivity.achievementsEarned, target: 200, unit: "وسام", category: "engagement", priority: "low" },
                ]}
                title="الأهداف العسكرية والتقييم"
              />
           </div>
           
           <ActivityFeed
               activities={safeRecentActivity.map((item: { type: string; id: string; time: Date; title: string | null }) => ({
                id: item.id,
                type: item.type as "user" | "exam" | "achievement" | "challenge" | "post" | "comment",
                title: item.title || "تحرك عسكري جديد",
                timestamp: new Date(item.time),
              }))}
              title="نشرة العمليات الأخيرة"
              maxItems={8}
              onRefresh={handleRefresh}
              loading={refreshing}
           />
        </div>
      )
    },
    {
      id: "events",
      content: (
        <div className={STYLES.glass + " p-10"}>
           <UpcomingEvents
               events={safeUpcomingEvents.map((event: { id: string; title: string; startDate: Date; location: string | null }) => ({
                id: event.id,
                title: event.title,
                date: new Date(event.startDate),
                type: "event" as const,
                location: event.location || undefined,
              }))}
              title="جدول العمليات والبطولات القادمة"
              maxItems={6}
           />
        </div>
      )
    }
  ];

  // Apply saved order or use default
  const sortedSections = widgetOrder.length > 0 
    ? widgetOrder.map(id => sections.find(s => s.id === id)).filter(Boolean) as typeof sections
    : sections;

  return (
    <div className="space-y-12 pb-20" dir="rtl">
      {/* --- Cinematic Header --- */}
      <m.div 
        initial={{ opacity: 0, y: -20, rotateX: -5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        className={STYLES.glass + " p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-10 group relative overflow-hidden"}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        
        <div className="space-y-4 text-center lg:text-right flex-1 relative z-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
            <Crown className="h-5 w-5" />
            <span>غرفة التحكم الملكية - Dungeon Master</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            لوحة <span className={STYLES.neonText}>إدارة المملكة</span>
          </h1>
          <p className="text-lg text-gray-400 font-medium max-w-2xl font-bold">
            أنت المتحكم في مصادر المحاربين. راقب الإحصائيات، وجّه الجيش الكان، وقم ببناء عظمة الجمهورية.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 bg-accent/10 p-4 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative z-10 shadow-2xl">
          <div className="flex items-center gap-4 px-6 py-2 border-l border-white/10 mr-4 hidden xl:flex">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">توقيت المملكة</span>
                <span className="text-sm font-black font-mono">{new Date().toLocaleTimeString('ar-EG')}</span>
             </div>
             <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Clock className="w-4 h-4 text-primary" />
             </div>
          </div>

          <Select value={timeFilter} onValueChange={(v) => { playSound('click'); setTimeFilter(v as TimeFilter); }}>
            <SelectTrigger className="w-40 h-12 rounded-2xl bg-background border-border text-foreground font-black hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-primary" />
                 <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover/90 backdrop-blur-xl border-border text-popover-foreground font-black rounded-2xl">
              {Object.entries(timeFilterLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="focus:bg-primary/20">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <AdminButton
            variant="outline"
            size="lg"
            onClick={handleExport}
            icon={Download}
            className="h-12 px-6 rounded-2xl border-white/10 text-foreground font-black uppercase text-[10px] tracking-widest hover:bg-accent shadow-lg"
          >
            تصدير المخطوطات
          </AdminButton>
          
          <AdminButton
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            loading={refreshing}
            icon={RefreshCw}
            className="h-12 w-12 rounded-2xl border-white/10 text-foreground hover:bg-accent shadow-lg"
          />
        </div>
      </m.div>

      <DraggableDashboard onOrderChange={handleOrderChange}>
        {sortedSections.map(s => ({ id: s.id, content: s.content }))}
      </DraggableDashboard>
    </div>
  );
}