"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Map,
  Clock,
  TrendingUp,
  Target,
  Flame,
  Brain,
  Layers,
  Sparkles,
  Search,
  Award,
  Sword,
  Calendar
} from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Recharts is heavy (~150KB) — loaded lazily as separate client chunks
// after hydration. The page itself stays a client component but its
// bundle is dramatically smaller on first paint.
const SkillRadarChart = dynamic(() => import("./components/ProgressCharts").then(mod => mod.SkillRadarChart), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-white/5 animate-pulse rounded-2xl" />
});

const ActivityAreaChart = dynamic(() => import("./components/ProgressCharts").then(mod => mod.ActivityAreaChart), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-white/5 animate-pulse rounded-2xl" />
});

const GrowthLineChart = dynamic(() => import("./components/ProgressCharts").then(mod => mod.GrowthLineChart), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-white/5 animate-pulse rounded-2xl" />
});

// framer-motion is heavy (~80KB) — we replace it with lightweight CSS
// animations (see `progress-fade-up`, `progress-fade-in`, `progress-pop`,
// `progress-width-grow` in globals.css). The visuals stay the same, the
// runtime cost is removed from the INP critical path.

const LOCAL_USER_KEY = "tw_user_id";

async function ensureUser(): Promise<string> {
  let id = safeGetItem(LOCAL_USER_KEY, { fallback: null });
  if (!id) {
    const res = await fetch("/api/users/guest", { method: "POST" });
    const data = await res.json();
    id = data.id;
    safeSetItem(LOCAL_USER_KEY, id!);
  }
  return id!;
}

// --- RPG Styles ---
const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6",
  divider: "rpg-divider",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

interface StudyStat {
  day: string;
  minutes: number;
  target: number;
}

interface SubjectSkill {
  subject: string;
  level: number;
}

interface ProgressPoint {
  month: string;
  xp: number;
}

// --- Data for Visualization ---
const studyStats: StudyStat[] = [];
const subjectSkills: SubjectSkill[] = [];
const progressPath: ProgressPoint[] = [];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number | string;
    name?: string;
    dataKey?: string | number;
    color?: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl text-xs sm:text-sm">
        <p className="font-bold mb-1 text-gray-200">{label}</p>
        <p className="text-primary">{`الدقائق: ${payload[0]!.value} دقيقة`}</p>
        {payload[1] && <p className="text-amber-500">{`الهدف: ${payload[1]!.value} دقيقة`}</p>}
      </div>
    );
  }
  return null;
};

export default function ProgressPage() {
  const [summary, setSummary] = useState<{totalMinutes: number;averageFocus: number;tasksCompleted: number;streakDays: number;} | null>(null);
  const [activeTab, setActiveTab] = useState('skills');
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const userId = await ensureUser();
        const res = await fetch(`/api/progress/summary?userId=${userId}`);
        
        if (!res.ok) {
          console.warn(`Progress summary API returned ${res.status}, using default values`);
          setSummary({
            totalMinutes: 0,
            averageFocus: 0,
            tasksCompleted: 0,
            streakDays: 0
          });
          return;
        }
        
        const data = await res.json();
        setSummary(data);
      } catch (err: unknown) {
        console.warn("Failed to fetch summary, using default values:", err instanceof Error ? err.message : String(err));
        setSummary({
          totalMinutes: 0,
          averageFocus: 0,
          tasksCompleted: 0,
          streakDays: 0
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const totalXP = summary ? summary.totalMinutes * 10 + summary.tasksCompleted * 100 : 0;
  const rank = totalXP > 10000 ? 'عقيد (Colonel)' : totalXP > 5000 ? 'رائد (Major)' : 'محارب (Warrior)';

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 blur-[100px] rounded-full" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1),transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        
        {/* --- Header Section --- */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-6 progress-fade-up"
        >
          <div className="space-y-4 text-center md:text-right">
             <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-400">
                <Map className="w-4 h-4" />
                <span>خريطة التقدم الاستراتيجي</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight">
               مخطط <span className={STYLES.neonText}>الإمبراطورية التعليمية</span>
             </h1>
             <p className="text-gray-400 font-medium max-w-xl text-lg">
                شاهد تطور مهاراتك، نفوذك، وسيطرتك على المواد الدراسية في تقرير الاستخبارات المركزي.
             </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">الرتبة الحالية</p>
                <p className={STYLES.goldText + " text-xl"}>{rank}</p>
             </div>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">الرصيد الإجمالي</p>
                <p className="text-white font-black text-xl">{totalXP} XP</p>
             </div>
          </div>
        </div>

        {/* --- Stats Grid --- */}
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { label: "إجمالي وقت التدريب", value: summary?.totalMinutes ?? 0, unit: "دقيقة", icon: Clock, color: "text-blue-400" },
            { label: "النشاط المستمر", value: summary?.streakDays ?? 0, unit: "يوم", icon: Flame, color: "text-orange-400" },
            { label: "معدل التركيز", value: summary?.averageFocus ?? 0, unit: "%", icon: Brain, color: "text-purple-400" },
            { label: "المهمات المنجزة", value: summary?.tasksCompleted ?? 0, unit: "مهمة", icon: Target, color: "text-emerald-400" }
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{ animationDelay: `${idx * 0.1}s` }}
              className={`${STYLES.glass} p-6 group hover:border-primary/50 transition-all cursor-default progress-pop`}
            >
              <div className="flex items-start justify-between">
                 <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6" />
                 </div>
                 <div className="text-left font-black text-white/10 text-4xl group-hover:text-primary/10 transition-colors">0{idx + 1}</div>
              </div>
              <div className="mt-8 space-y-1">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{stat.value}</span>
                    <span className="text-gray-400 font-medium">{stat.unit}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- Main Content Tabs --- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
           <TabsList className="bg-white/5 border border-white/10 p-1.5 h-14 rounded-2xl gap-2 backdrop-blur-xl">
              <TabsTrigger value="skills" className="rounded-xl flex items-center gap-2 font-bold px-8 data-[state=active]:bg-primary data-[state=active]:text-white">
                 <Sword className="w-4 h-4" />
                 <span>دليل المهارات</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="rounded-xl flex items-center gap-2 font-bold px-8 data-[state=active]:bg-primary data-[state=active]:text-white">
                 <TrendingUp className="w-4 h-4" />
                 <span>المنحنيات الزمنية</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl flex items-center gap-2 font-bold px-8 data-[state=active]:bg-primary data-[state=active]:text-white">
                 <Layers className="w-4 h-4" />
                 <span>سجل القتال</span>
              </TabsTrigger>
           </TabsList>

           <TabsContent key="skills" value="skills" className="m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Radar Chart Section */}
                 <div
                   key="skills-radar"
                   className={`${STYLES.glass} lg:col-span-2 p-8 progress-fade-up`}
                 >
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black">رادار الموهبة الدراسي</h3>
                        <p className="text-gray-400">تحليل القوة والضعف للمواد الأساسية</p>
                      </div>
                      <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                         <Target className="w-6 h-6" />
                      </div>
                   </div>
                   <div className="h-[400px] min-h-[400px] w-full min-w-0">
                      <SkillRadarChart subjectSkills={subjectSkills} />
                   </div>
                 </div>

                 {/* Skill List Section */}
                 <div
                   key="skills-list"
                   className="space-y-6 progress-fade-up"
                 >
                   <h3 className="text-xl font-black flex items-center gap-3">
                      <Award className="text-amber-500 w-6 h-6" />
                      <span>ترقيات المواد</span>
                   </h3>
                   <div className="space-y-4">
                      {subjectSkills.slice(0, 4).map((skill, idx) => (
                        <Card key={idx} className={STYLES.glass + " border-white/5 bg-transparent p-5 space-y-3"}>
                          <div className="flex justify-between items-center">
                             <p className="font-bold">{skill.subject}</p>
                             <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Lvl {Math.floor(skill.level / 10)}</span>
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between text-xs text-gray-500">
                                <span>XP: {skill.level * 10} / 1000</span>
                                <span>{skill.level}%</span>
                             </div>
                             <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  style={{
                                    width: `${skill.level}%`,
                                    animationDelay: `${idx * 0.1}s`,
                                  }}
                                  className="h-full bg-gradient-to-r from-primary to-indigo-400 progress-width-grow"
                                />
                             </div>
                          </div>
                        </Card>
                      ))}
                   </div>
                   <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-gray-500 hover:text-white rounded-xl h-12">
                      عرض جميع المهارات
                   </Button>
                 </div>
              </div>
           </TabsContent>

           <TabsContent key="charts" value="charts" className="m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Activity Area Chart */}
                 <div
                   key="chart-activity"
                   className={`${STYLES.glass} p-8 progress-fade-in`}
                 >
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black">نشاط المعركة الأسبوعي</h3>
                        <p className="text-gray-400">توزيع الدقائق المستثمرة في التدريب</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-3 h-3 rounded bg-primary" />
                            <span>الفعلي</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
                            <span>الهدف</span>
                         </div>
                      </div>
                   </div>
                   <div className="h-[350px] min-h-[350px] w-full min-w-0">
                      <ActivityAreaChart studyStats={studyStats} CustomTooltip={CustomTooltip} />
                   </div>
                 </div>

                 {/* Progression Line Chart */}
                 <div
                   key="chart-growth"
                   className={`${STYLES.glass} p-8 progress-fade-in`}
                 >
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black">نمو الإمبراطورية (XP Growth)</h3>
                        <p className="text-gray-400">المعدل الشهري لاكتساب نقاط الخبرة</p>
                      </div>
                      <Sparkles className="text-amber-400 w-6 h-6" />
                   </div>
                   <div className="h-[350px] min-h-[350px] w-full min-w-0">
                      <GrowthLineChart progressPath={progressPath} />
                   </div>
                 </div>
              </div>
           </TabsContent>

           <TabsContent key="history" value="history" className="m-0 focus-visible:outline-none">
              <div className={STYLES.glass + " p-8"}>
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black">أرشيف الإنجازات</h3>
                    <div className="flex gap-2">
                       <Button size="icon" variant="outline" className="border-white/10 rounded-xl">
                          <Search className="w-5 h-5" />
                       </Button>
                       <Button size="icon" variant="outline" className="border-white/10 rounded-xl">
                          <Calendar className="w-5 h-5" />
                       </Button>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="text-center py-20 text-gray-500 font-bold border-2 border-dashed border-white/5 rounded-3xl">
                       لا يوجد سجل قتال متاح حالياً. ابدأ أول درس لك للظهور هنا!
                    </div>
                 </div>
              </div>
           </TabsContent>
        </Tabs>

        {/* --- Footer Status --- */}
        <div className="flex justify-center pt-8 opacity-50">
           <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              تخمين استخباراتي: أنت على وشك الوصول للمستوى التالي قريباً!
           </p>
        </div>
      </div>
    </div>
  );
}
