"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckSquare,
  Settings,
  Sparkles,
  Trophy,
  User,
  Zap,
  Sword,
  Shield,


  BookOpen,

  Target,

  LayoutDashboard,
  AlertCircle,

  ChevronRight,
  TrendingUp,
  Award } from

"lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { useGamification } from "@/hooks/use-gamification";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

import dynamic from "next/dynamic";

// Import custom components
const AnnouncementTicker = dynamic(() => import("./components/announcement-ticker").then((mod) => mod.AnnouncementTicker), { ssr: false });
const StatsGrid = dynamic(() => import("./components/stats-grid").then((mod) => mod.StatsGrid), { ssr: true });
const QuestCard = dynamic(() => import("./components/quest-card").then((mod) => mod.QuestCard), { ssr: false });
const LeaderboardCard = dynamic(() => import("./components/leaderboard-card").then((mod) => mod.LeaderboardCard), { ssr: false });
const QuickActions = dynamic(() => import("./components/quick-actions").then((mod) => mod.QuickActions), { ssr: false });
import { Clock } from "./components/clock";
// Removed redundant Bot import to favor local custom SVG if needed, or aliased below

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5",
  card: "rpg-card h-full",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black",
  divider: "rpg-divider"
};

const quickLinks = [
{
  title: "خريطة التقدم",
  description: "راقب توسع نفوذك وإنجازاتك في عالمك الدراسي",
  href: "/progress",
  icon: BarChart3,
  color: "text-blue-400",
  bgColor: "bg-blue-400/10",
  delay: 0.1
},
{
  title: "سجل المهام (Quests)",
  description: "المهام اليومية، الأسبوعية، والمهمات الملحمية",
  href: "/tasks",
  icon: CheckSquare,
  color: "text-amber-400",
  bgColor: "bg-amber-400/10",
  delay: 0.2
},
{
  title: "جدول المعارك",
  description: "تنظيم وقت المذاكرة والتحضير للامتحانات القادمة",
  href: "/schedule",
  icon: Calendar,
  color: "text-emerald-400",
  bgColor: "bg-emerald-400/10",
  delay: 0.3
},
{
  title: "لوحة الشرف",
  description: "الألقاب، الأوسمة، وترتيبك بين المحاربين",
  href: "/achievements",
  icon: Trophy,
  color: "text-purple-400",
  bgColor: "bg-purple-400/10",
  delay: 0.4
}];


const recentActivity = [
{ id: 1, title: "أكملت درس الكيمياء العضوية", time: "منذ ساعتين", xp: "+50 XP", icon: BookOpen, color: "text-blue-400" },
{ id: 2, title: "حققت هدف التركيز اليومي", time: "منذ 5 ساعات", xp: "+120 XP", icon: Target, color: "text-emerald-400" },
{ id: 3, title: "ترقيت إلى الرتبة الفضية", time: "يوم أمس", xp: "Rank Up!", icon: Award, color: "text-amber-400" }];


export default function DashboardPage() {
  const { user, isLoading: isAuthLoading, fetchWithAuth } = useAuth();
  const { userProgress, isLoading: isGamificationLoading } = useGamification({
    userId: user?.id || ""
  });
  const [mounted, setMounted] = useState(false);
  const [lastCourse, setLastCourse] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        setIsDataLoading(true);
        // Fetch last course and notifications for activity
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
          setRecentActivities(notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            time: new Date(n.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            xp: n.type === 'SUCCESS' ? '+XP' : '',
            icon: n.icon === 'trophy' ? Trophy : n.icon === 'graduation-cap' ? BookOpen : Target,
            color: n.type === 'SUCCESS' ? 'text-emerald-400' : 'text-blue-400'
          })));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user, fetchWithAuth]);

  // Performance Optimization: Defer rendering but allow SSR skeleton
  if (isAuthLoading || isGamificationLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="flex h-full w-full animate-pulse items-center justify-center rounded-full bg-primary/10 border border-primary/20">
             <LayoutDashboard className="h-10 w-10 text-primary" />
          </div>
        </div>
      </div>);

  }

  const displayName = user?.name || user?.username || user?.email?.split("@")[0] || "يا بطل";
  const userLevel = userProgress?.level || user?.level || 1;
  const userXP = userProgress?.totalXP || user?.totalXP || 0;
  const nextLevelXP = userLevel * 1000;
  const xpPercentage = Math.min(userXP % nextLevelXP / (nextLevelXP / 100), 100);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      {/* --- Mesh Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full opacity-40 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full opacity-30 -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <AnnouncementTicker />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10" dir="rtl">
        
        {/* --- Epic Hero Header --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={STYLES.glass + " p-8 md:p-12 border-primary/20 shadow-primary/5 group transition-all duration-700 hover:border-primary/40"}>
          
          {/* Animated Background Decoration */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent group-hover:via-primary transition-all duration-700" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            <div className="space-y-6 flex-1 text-center md:text-right">
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-xs font-black uppercase tracking-widest text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                  
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>القائد العام للمنصة</span>
                </motion.div>
                <Clock />
              </div>

              <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-none">
                أهلاً، <span className={STYLES.neonText}>{displayName}</span>
                <motion.span
                  animate={{ rotate: [0, 10, -10, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="inline-block mr-4 scale-75 md:scale-100">
                  
                  🛡️
                </motion.span>
              </h1>

              <p className="max-w-2xl text-xl text-gray-400 font-medium leading-relaxed">
                قوتك تزداد يوماً بعد يوم، الرتبة القادمة بانتظارك. هل أنت مستعد لخوض تحديات اليوم الملحمية؟
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                 <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-14 rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.4)] flex items-center gap-2 group-hover:scale-105 transition-all text-lg border-b-4 border-black/20">
                    <Zap className="w-5 h-5 fill-white" />
                    ابدأ جلسة المذاكرة
                 </Button>
                 <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 font-black text-lg gap-2">
                    <LayoutDashboard className="w-5 h-5" />
                    التقارير التفصيلية
                 </Button>
              </div>
            </div>

            {/* Level Hexagon Display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 3 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative">
              
               <motion.div
                animate={{
                  boxShadow: ["0 0 40px rgba(var(--primary), 0.1)", "0 0 80px rgba(var(--primary), 0.3)", "0 0 40px rgba(var(--primary), 0.1)"]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 blur-3xl opacity-60" />
              
               <div className="relative flex items-center justify-center h-64 w-64 bg-card/60 border-2 border-primary/40 rounded-[3.5rem] shadow-2xl backdrop-blur-3xl overflow-hidden ring-8 ring-white/5 group/level">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-600/10 opacity-30" />
                  
                  {/* Rotating Border Effect */}
                  <div className="absolute inset-0 border-4 border-transparent border-t-primary/50 border-r-primary/20 rounded-full animate-spin-slow scale-110 pointer-events-none" />

                  <div className="text-center space-y-1 relative z-10">
                    <p className="text-gray-400 text-xs font-black uppercase tracking-tighter">الرتبة الأكاديمية</p>
                    <p className={STYLES.neonText + " text-9xl font-black drop-shadow-2xl"}>{userLevel}</p>
                    <div className="flex flex-col items-center justify-center gap-1 mt-2">
                       <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 shadow-inner">
                          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                          <span className="text-white font-black text-lg">{userXP.toLocaleString()} XP</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Circular XP Progress */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-4">
                     <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                     <motion.circle
                    initial={{ strokeDashoffset: 628 }}
                    animate={{ strokeDashoffset: 628 * (1 - xpPercentage / 100) }}
                    transition={{ duration: 2.5, ease: "circOut" }}
                    cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={628} className="text-primary drop-shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                  
                  </svg>
               </div>
               
               {/* Level Tooltip Floating */}
               <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl z-20 whitespace-nowrap">
                
                  متبقي {(nextLevelXP - userXP % nextLevelXP).toLocaleString()} XP للترقية التالية 🎉
               </motion.div>
            </motion.div>
          </div>

          {/* --- Continue Learning Banner --- */}
          <AnimatePresence>
            {lastCourse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-8"
              >
                <div className="relative group overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background p-6 md:p-8 shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="relative h-32 w-48 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-2xl">
                      {lastCourse.thumbnailUrl ? (
                        <img src={lastCourse.thumbnailUrl} alt={lastCourse.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-primary" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10 text-white fill-white" />
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-right space-y-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black">تابع من حيث توقفت</Badge>
                      <h3 className="text-2xl font-black text-white">{lastCourse.title}</h3>
                      <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          <span>إنجاز {lastCourse.progress}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>آخر دخول: {new Date(lastCourse.lastAccessedAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${lastCourse.progress}%` }}
                          className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        />
                      </div>
                    </div>

                    <Button asChild className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black gap-2 shrink-0 border-b-4 border-black/20">
                      <Link href={`/learning/${lastCourse.id}`}>
                        <Play className="w-5 h-5 fill-white" />
                        متابعة الدرس
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={STYLES.divider} />

          <StatsGrid
            currentStreak={user?.currentStreak || 0}
            totalXP={userXP}
            achievementsCount={userProgress?.achievements?.length || 0} />
          
        </motion.div>
        
        {/* --- Dynamic Verification Banner --- */}
        <AnimatePresence>
          {mounted && (!user?.emailVerified || !user?.phoneVerified) &&
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            className="space-y-4">
            
              {!user?.emailVerified &&
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-xl backdrop-blur-xl group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 group-hover:scale-110 transition-transform shadow-lg border border-amber-500/30">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <div className="flex-1 text-center sm:text-right">
                    <p className="font-black text-2xl tracking-tight">تفعيل البريد الإلكتروني (إجباري)</p>
                    <p className="text-sm text-amber-500/80 font-medium">أمان حسابك يبدأ من هنا. تفقد بريدك واضغط على الرابط لتفادي حظر الميزات المتقدمة.</p>
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto border-amber-500/40 hover:bg-amber-500 hover:text-black text-amber-500 font-black rounded-2xl h-14 px-10 transition-all border-b-4 border-black/10" asChild>
                    <Link href="/settings/security">تفعيل بريدي الآن</Link>
                  </Button>
                </div>
            }
            </motion.div>
          }
        </AnimatePresence>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: link.delay }}
                    whileHover={{ scale: 1.02 }}>
                    
                    <Link href={link.href} className="block group h-full">
                      <Card className={STYLES.card + " border-white/5 hover:border-primary/30 p-8"}>
                        <div className="flex items-start gap-6">
                           <div className={`p-5 rounded-2xl ${link.bgColor} ${link.color} group-hover:scale-110 group-hover:rotate-6 transition-all shadow-2xl border border-white/10`}>
                              <Icon className="h-10 w-10" />
                           </div>
                           <div className="space-y-2">
                              <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{link.title}</CardTitle>
                              <CardDescription className="text-gray-400 text-base leading-relaxed">{link.description}</CardDescription>
                           </div>
                        </div>
                        <div className="mt-10 flex items-center justify-between">
                            <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden mr-6 shadow-inner border border-white/5">
                               <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "75%" }}
                              transition={{ duration: 1.5, delay: 1 }}
                              className={`h-full bg-gradient-to-r ${link.color === 'text-blue-400' ? 'from-blue-600 to-blue-300' : link.color === 'text-amber-400' ? 'from-amber-600 to-amber-300' : link.color === 'text-emerald-400' ? 'from-emerald-600 to-emerald-300' : 'from-purple-600 to-purple-300'} shadow-[0_0_15px_rgba(255,255,255,0.1)]`} />
                            
                            </div>
                            <Button variant="ghost" size="sm" className="group-hover:bg-primary/20 group-hover:text-primary gap-2 font-black h-10 px-6 rounded-xl transition-all">
                               <span>دخول</span>
                               <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                            </Button>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>);

              })}
            </div>

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
              
              <Card className={STYLES.glass + " border-white/5 bg-transparent p-6 space-y-6"}>
                {recentActivities.length > 0 ? recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all cursor-default group">
                      
                      <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-xl bg-white/5 ${activity.color} group-hover:scale-110 transition-transform`}>
                            <Icon className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="font-bold text-sm leading-tight line-clamp-1">{activity.title}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{activity.time}</p>
                         </div>
                      </div>
                      {activity.xp && (
                        <Badge className="text-[10px] font-black bg-emerald-500 text-black">
                          {activity.xp}
                        </Badge>
                      )}
                    </motion.div>);

                })}
                
                <Button variant="ghost" className="w-full text-gray-500 font-black hover:text-white hover:bg-white/5 text-xs py-2 h-auto rounded-xl">
                  عرض الأرشيف الكامل
                </Button>
              </Card>
            </div>

            {/* AI Assistant Promo */}
            <Card className={STYLES.glass + " border-primary/20 bg-gradient-to-br from-primary/10 to-indigo-950/20 p-8 text-center space-y-6 group overflow-hidden relative"}>
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
              
              <div className="relative">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 1, type: "spring" }}
                  className="mx-auto w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center shadow-2xl relative z-10">
                  
                   <Bot className="w-12 h-12 text-white drop-shadow-lg" />
                   <div className="absolute inset-0 rounded-[2.5rem] bg-white/20 animate-pulse pointer-events-none" />
                </motion.div>
              </div>

              <div className="space-y-3 relative z-10">
                <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">مساعدك الذكي دائمـاً معك!</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed px-2">هل تواجه تحدياً في الرياضيات؟ أو تحتاج لشرح سريع في الفيزياء؟ رفيقي هنا للإجابة.</p>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black shadow-[0_15px_30px_rgba(var(--primary),0.3)] group-hover:scale-105 transition-all text-sm h-14 rounded-2xl border-b-4 border-black/30">
                 افتح بوابة الحكمة
              </Button>
              
              <div className="flex items-center justify-center gap-2 pt-2 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  <Badge variant="outline" className="text-[9px] font-black border-white/10 uppercase tracking-tighter">AI 4.0</Badge>
                  <Badge variant="outline" className="text-[9px] font-black border-white/10 uppercase tracking-tighter">Latent Space</Badge>
              </div>
            </Card>
          </div>

        </div>

        {/* --- Social Goal Section --- */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={STYLES.glass + " p-10 border-white/5 group relative"}>
          
           <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
           <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="relative h-40 w-40 flex-shrink-0">
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                    <motion.circle
                  initial={{ strokeDashoffset: 452 }}
                  whileInView={{ strokeDashoffset: 452 * (1 - 0.75) }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={452} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-4xl font-black text-white">
                  
                      75%
                    </motion.span>
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">اكتمال الهدف</span>
                 </div>
              </div>

              <div className="flex-1 space-y-6">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="text-right md:text-right">
                        <h4 className="text-3xl font-black text-white">هدف المعسكر التدريبي اليومي</h4>
                        <p className="text-gray-400 text-lg font-medium mt-1">تطورك مستمر؛ أنجز 45 دقيقة إضافية لتصل للقمة اليوم.</p>
                    </div>
                    
                    {/* Active Students Avatars */}
                    <div className="flex flex-col items-center md:items-end gap-3">
                       <div className="flex -space-x-4 space-x-reverse">
                          {[1, 2, 3, 4, 5].map((i) =>
                    <motion.div
                      key={i}
                      whileHover={{ y: -5, scale: 1.1, zIndex: 50 }}
                      className="h-12 w-12 rounded-full border-2 border-background bg-card flex items-center justify-center overflow-hidden hover:border-primary transition-all cursor-pointer shadow-xl relative">
                      
                             <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`} alt="user" width={48} height={48} className="object-cover" />
                          </motion.div>
                    )}
                          <div className="h-12 w-12 rounded-full border-2 border-background bg-primary flex items-center justify-center text-xs font-black text-white relative z-10 shadow-xl shadow-primary/20">
                             +1.2k
                          </div>
                       </div>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          1,452 طالباً يذاكرون معك الآن
                       </p>
                    </div>
                 </div>

                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl px-5 py-2 text-xs font-black">كيمياء ✅ تم الإنجاز</Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl px-5 py-2 text-xs font-black">فيزياء ✅ تم الإنجاز</Badge>
                    <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-xl px-5 py-2 text-xs font-black animate-pulse">رياضيات ⏳ قيد العمل</Badge>
                    <Badge className="bg-white/5 text-gray-500 border border-white/10 rounded-xl px-5 py-2 text-xs font-black">أحياء 🔒 لم يبدأ</Badge>
                  </div>
              </div>
           </div>
        </motion.div>

        {/* --- Professional Footer Status --- */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 pb-12 border-t border-white/5 gap-8">
           <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 text-xs font-bold text-gray-600">
              <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-full">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                 <span>استقرار النظام: 100%</span>
              </div>
              <div className="flex items-center gap-2">
                 <TrendingUp className="w-3 h-3 text-primary" />
                 <span>السرعة: 18ms</span>
              </div>
              <span>تحديث الإصدار: V5.1 (Alpha)</span>
           </div>
           
           <div className="flex items-center gap-4">
              <Button size="icon" variant="ghost" className="h-12 w-12 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5" asChild>
                 <Link href="/settings"><Settings className="w-5 h-5" /></Link>
              </Button>
              <Button size="icon" variant="ghost" className="h-12 w-12 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5" asChild>
                 <Link href="/profile"><User className="w-5 h-5" /></Link>
              </Button>
           </div>
        </div>
      </div>
      <QuickActions />
    </div>);

}

function Bot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round">
      
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>);

}