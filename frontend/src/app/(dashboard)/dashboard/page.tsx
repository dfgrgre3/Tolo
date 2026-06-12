"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import {
  Trophy, Sword, Shield, BookOpen, Target, LayoutDashboard, ChevronRight
} from "lucide-react";
import dynamic from "next/dynamic";

import { useAuth } from "@/contexts/auth-context";
import { useGamification } from "@/hooks/use-gamification";
import { logger } from '@/lib/logger';

// --- Dynamic Component Imports ---
const AnnouncementTicker = dynamic(() => import("./components/announcement-ticker").then((mod) => mod.AnnouncementTicker), { ssr: false });
const QuestCard = dynamic(() => import("./components/quest-card").then((mod) => mod.QuestCard), { ssr: false });
const LeaderboardCard = dynamic(() => import("./components/leaderboard-card").then((mod) => mod.LeaderboardCard), { ssr: false });
const QuickActions = dynamic(() => import("./components/quick-actions").then((mod) => mod.QuickActions), { ssr: false });

// --- New Modular Components ---
import { DashboardHero } from "./components/dashboard-hero";
import { OperationsGrid } from "./components/operations-grid";
import { RecentActivitySidebar } from "./components/recent-activity-sidebar";
import { AIAssistantPromo } from "./components/ai-assistant-promo";
import { SocialGoalSection } from "./components/social-goal-section";
import { DashboardFooter } from "./components/dashboard-footer";

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5",
  card: "rpg-card h-full",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black",
  divider: "rpg-divider"
};

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading, fetchWithAuth } = useAuth();
  const { userProgress } = useGamification({
    userId: user?.id || ""
  });
  const [mounted, setMounted] = useState(false);
  const [lastCourse, setLastCourse] = useState<{ id: string; title: string; thumbnailUrl?: string; progress: number; lastAccessedAt: string } | null>(null);
  const [recentActivities, setRecentActivities] = useState<{ id: string; title: string; time: string; xp: string; icon: React.ElementType; color: string }[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        setIsDataLoading(true);
        const [coursesRes, activitiesRes] = await Promise.all([
          fetchWithAuth("/api/my-courses?limit=1"),
          fetchWithAuth("/api/notifications?limit=5")
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          const courses = data.data?.courses || data.courses || [];
          if (courses.length > 0) setLastCourse(courses[0]);
        }

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          const notifications = data.data?.notifications || data.notifications || [];
          type ApiNotification = { id: string; title: string; createdAt: string; type: string; icon: string };
          setRecentActivities(notifications.map((n: ApiNotification) => ({
            id: n.id,
            title: n.title,
            time: new Date(n.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            xp: n.type === 'SUCCESS' ? '+XP' : '',
            icon: n.icon === 'trophy' ? Trophy : n.icon === 'graduation-cap' ? BookOpen : Target,
            color: n.type === 'SUCCESS' ? 'text-emerald-400' : 'text-blue-400'
          })));
        }
      } catch (error) {
        logger.error("Error fetching dashboard data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user, fetchWithAuth]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="flex h-full w-full animate-pulse items-center justify-center rounded-full bg-primary/10 border border-primary/20">
             <LayoutDashboard className="h-10 w-10 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.name || user?.username || user?.email?.split("@")[0] || "يا بطل";
  const userLevel = userProgress?.level || 1;
  const userXP = userProgress?.totalXP || 0;
  const nextLevelXP = userLevel * 1000;
  const xpPercentage = Math.min((userXP % nextLevelXP) / (nextLevelXP / 100), 100);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      {/* --- Mesh Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] lg:w-[800px] lg:h-[800px] bg-primary/10 blur-[100px] sm:blur-[130px] lg:blur-[150px] rounded-full opacity-40 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] lg:w-[600px] lg:h-[600px] bg-purple-600/10 blur-[100px] sm:blur-[130px] lg:blur-[150px] rounded-full opacity-30 -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
      </div>

      <AnnouncementTicker />

      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8 space-y-6 sm:space-y-8 md:space-y-10" dir="rtl">
        
        {/* --- Epic Hero Header --- */}
        <DashboardHero
          displayName={displayName}
          userLevel={userLevel}
          userXP={userXP}
          nextLevelXP={nextLevelXP}
          xpPercentage={xpPercentage}
          lastCourse={lastCourse}
          userProgress={userProgress}
          styles={STYLES}
        />
        
        {/* --- Dynamic Verification Banner --- */}
        {mounted && (!user?.emailVerified || !user?.phoneVerified) && (
          <div className="space-y-4">
            {!user?.emailVerified && (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-xl backdrop-blur-xl group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 group-hover:scale-110 transition-transform shadow-lg border border-amber-500/30">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1 text-center sm:text-right">
                  <p className="font-black text-2xl tracking-tight">تفعيل البريد الإلكتروني (إجباري)</p>
                  <p className="text-sm text-amber-500/80 font-medium">أمان حسابك يبدأ من هنا. تفقد بريدك واضغط على الرابط لتفادي حظر الميزات المتقدمة.</p>
                </div>
                <button className="w-full sm:w-auto border border-amber-500/40 hover:bg-amber-500 hover:text-black text-amber-500 font-black rounded-2xl h-14 px-10 transition-all border-b-4 border-black/10 bg-transparent">
                  <Link href="/settings/security">تفعيل بريدي الآن</Link>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* --- Navigation & Quest Grid (Left 8 cols) --- */}
          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black flex items-center gap-4">
                <Sword className="text-primary w-8 h-8" />
                <span>قائمة العمليات</span>
              </h2>
              <Link href="/all-features" className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 font-bold group">
                عرض كل الميزات
                <ChevronRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <OperationsGrid cardStyle={STYLES.card} />

            {/* Featured Quest Section */}
            <div className="space-y-6 pt-4">
              <h2 className="text-3xl font-black flex items-center gap-4">
                <Target className="text-orange-500 w-8 h-8" />
                <span>المهمة الجارية</span>
              </h2>
              <QuestCard />
            </div>
          </div>

          {/* --- Sidebar (Right 4 cols) --- */}
          <div className="lg:col-span-4 space-y-10">
            {/* Leaderboard Card */}
            <LeaderboardCard />

            <div className="space-y-6">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <Shield className="text-primary w-6 h-6" />
                <span>سجل الميدان</span>
              </h2>
              <RecentActivitySidebar recentActivities={recentActivities} glassStyle={STYLES.glass} />
            </div>

            {/* AI Assistant Promo */}
            <AIAssistantPromo glassStyle={STYLES.glass} />
          </div>

        </div>

        {/* --- Social Goal Section --- */}
        <SocialGoalSection glassStyle={STYLES.glass} />

        {/* --- Professional Footer Status --- */}
        <DashboardFooter />
      </div>
      <QuickActions />
    </div>
  );
}
