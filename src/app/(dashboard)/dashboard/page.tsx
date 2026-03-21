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
  Clock, 
  Play, 
  BookOpen,
  TrendingUp,
  Star,
  Target,
  Flame,
  LayoutDashboard
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// --- RPG Style Constants (Synced with globals.css) ---
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
  }
];

const recentActivity = [
  { id: 1, title: "أكملت درس الكيمياء العضوية", time: "منذ ساعتين", xp: "+50 XP", icon: BookOpen, color: "text-blue-400" },
  { id: 2, title: "حققت هدف التركيز اليومي", time: "منذ 5 ساعات", xp: "+120 XP", icon: Target, color: "text-emerald-400" },
  { id: 3, title: "ترقيت إلى الرتبة الفضية", time: "يوم أمس", xp: "Rank Up!", icon: Medal, color: "text-amber-400" },
];

function Medal(props: any) {
    return <Star {...props} />
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="flex h-full w-full animate-pulse items-center justify-center rounded-full bg-primary/10">
             <LayoutDashboard className="h-10 w-10 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.name || user?.username || user?.email?.split("@")[0] || "يا بطل";
  const userLevel = user?.level || 1;
  const userXP = user?.totalXP || 0;
  const nextLevelXP = 1000;
  const xpPercentage = (userXP % nextLevelXP) / 10;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-50 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full opacity-30 -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" dir="rtl">
        
        {/* --- Hero Header Section --- */}
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           className={STYLES.glass + " p-8 md:p-12"}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-right">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                <Sparkles className="h-4 w-4" />
                <span>غرفة العمليات المركزية</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                مرحباً بك مجدداً، <br />
                <span className={STYLES.neonText}>{displayName}</span>
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block mr-3"
                >
                  ⚔️
                </motion.span>
              </h1>
              <p className="max-w-xl text-lg text-gray-400 font-medium">
                استعد لليوم الجديد! عالمك ينتظر إنجازاتك القادمة. تفقد مهامك وابدأ في رفع مستواك.
              </p>
            </div>

            {/* Level Hexagon */}
            <div className="relative group">
               <div className="absolute inset-0 bg-primary/20 blur-2xl group-hover:bg-primary/40 transition-all duration-700" />
               <div className="relative flex items-center justify-center h-48 w-48 bg-card/40 border-2 border-primary/30 rounded-[2.5rem] rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl backdrop-blur-3xl overflow-hidden ring-4 ring-border/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <div className="text-center space-y-1 relative z-10">
                    <p className="text-gray-400 text-sm font-bold uppercase">المستوى</p>
                    <p className={STYLES.neonText + " text-7xl underline"}>{userLevel}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                       <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                       <span className="text-amber-500 font-black text-xs">{userXP} XP</span>
                    </div>
                  </div>
                  {/* Progress Ring Overlay (Subtle) */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none opacity-20">
                     <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                     <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={552} strokeDashoffset={552 * (1 - xpPercentage/100)} className="text-primary" />
                  </svg>
               </div>
            </div>
          </div>

          <div className={STYLES.divider} />

          {/* Mini Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="flex items-center gap-4 group cursor-default">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                   <Flame className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-gray-500 text-xs font-bold uppercase">النشاط المستمر</p>
                   <p className="text-white font-black text-xl">{user?.currentStreak || 0} أيام متتالية</p>
                </div>
             </div>
             <div className="flex items-center gap-4 group cursor-default">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                   <Clock className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-gray-500 text-xs font-bold uppercase">وقت التدريب</p>
                   <p className="text-white font-black text-xl">42 ساعة</p>
                </div>
             </div>
             <div className="flex items-center gap-4 group cursor-default">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                   <Target className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-gray-500 text-xs font-bold uppercase">دقة الإنجاز</p>
                   <p className="text-white font-black text-xl">88%</p>
                </div>
             </div>
             <div className="flex items-center gap-4 group cursor-default">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                   <Trophy className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-gray-500 text-xs font-bold uppercase">الألقاب المحققة</p>
                   <p className="text-white font-black text-xl">14 لقب</p>
                </div>
             </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- Main Navigation Grid (2/3 width) --- */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Sword className="text-primary w-6 h-6" />
              <span>البوابات الحيوية</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: link.delay }}
                  >
                    <Link href={link.href} className="block group h-full">
                      <Card className={STYLES.card}>
                        <div className="flex items-start gap-4">
                           <div className={`p-4 rounded-2xl ${link.bgColor} ${link.color} group-hover:scale-110 transition-transform shadow-lg`}>
                              <Icon className="h-8 w-8" />
                           </div>
                           <div className="space-y-1">
                              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{link.title}</CardTitle>
                              <CardDescription className="text-gray-400 text-sm">{link.description}</CardDescription>
                           </div>
                        </div>
                        <div className="mt-8 flex items-center justify-between">
                            <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden mr-4">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: "65%" }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                  className={`h-full bg-gradient-to-r ${link.color === 'text-blue-400' ? 'from-blue-600 to-blue-400' : link.color === 'text-amber-400' ? 'from-amber-600 to-amber-400' : link.color === 'text-emerald-400' ? 'from-emerald-600 to-emerald-400' : 'from-purple-600 to-purple-400'}`}
                               />
                            </div>
                            <Button variant="ghost" size="sm" className="group-hover:bg-white/5 gap-2 font-bold p-0 px-4">
                               <span>دخول</span>
                               <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                            </Button>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Current Quest Section */}
            <div className={STYLES.glass + " p-8 relative"}>
               <div className="absolute top-0 right-10 -translate-y-1/2">
                  <Badge className="bg-amber-500 text-black px-4 py-1.5 font-black text-sm border-2 border-black">المهمة النشطة حالياً</Badge>
               </div>
               <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                     <div className="h-20 w-20 rounded-full border-4 border-amber-500/30 flex items-center justify-center bg-amber-500/5 relative">
                        <Play className="w-8 h-8 text-amber-500 fill-amber-500 ml-1" />
                        <div className="absolute inset-0 rounded-full border-2 border-amber-500 animate-pulse" />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-2xl font-black">جلسة كيمياء: الروابط التساهمية</h3>
                        <p className="text-gray-400">بدأت الجلسة منذ 15 دقيقة • متبقي 30 دقيقة</p>
                     </div>
                  </div>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-black px-10 h-14 rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.3)]">
                    العودة للمهمة
                  </Button>
               </div>
            </div>
          </div>

          {/* --- Secondary Actions (1/3 width) --- */}
          <div className="space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Shield className="text-primary w-6 h-6" />
              <span>سجل المعارك الأخير</span>
            </h2>
            
            <Card className={STYLES.glass + " border-white/5 bg-transparent p-6 space-y-6"}>
              {recentActivity.map((activity, idx) => {
                const Icon = activity.icon;
                return (
                  <motion.div 
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all cursor-default"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-xl bg-white/5 ${activity.color}`}>
                          <Icon className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="font-bold text-sm">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                       </div>
                    </div>
                    <span className={`text-xs font-black ${activity.xp.includes('XP') ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activity.xp}
                    </span>
                  </motion.div>
                )
              })}
              
              <Button variant="ghost" className="w-full text-gray-500 hover:text-white hover:bg-white/5">
                عرض كل النشاطات القديمة
              </Button>
            </Card>

            <h2 className="text-2xl font-black flex items-center gap-3 pt-4">
              <Star className="text-amber-400 w-6 h-6" />
              <span>دليل المهارات</span>
            </h2>

            <Card className={STYLES.glass + " border-white/5 bg-transparent p-8 text-center space-y-6"}>
              <div className="mx-auto w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-2xl rotate-12">
                 <Bot className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">العراف الذكي جاهز!</h3>
                <p className="text-sm text-gray-400">هل تحتاج لمسودة مذاكرة سريعة أو حل لأحجية معقدة؟</p>
              </div>
              <Button className="w-full bg-white text-black font-black hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs h-12 rounded-xl">
                 اسأل العراف (AI)
              </Button>
            </Card>
          </div>

        </div>

        {/* --- Footer Status --- */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 pb-8 border-t border-white/5 gap-4">
           <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span>نظام التدريب: متصل</span>
              </div>
              <span>خادم الشرق الأوسط: 24ms</span>
              <span>الإصدار: 4.2.0-Alpha</span>
           </div>
           
           <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="text-gray-500 hover:text-white hover:bg-white/5 rounded-xl">
                 <Settings className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="text-gray-500 hover:text-white hover:bg-white/5 rounded-xl">
                 <User className="w-5 h-5" />
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}

function Bot(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
