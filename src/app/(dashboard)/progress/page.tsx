"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";
import { 
  Map, 
  Clock,
  Trophy, 
  Zap, 
  TrendingUp, 
  Calendar, 
  Target, 
  Flame, 
  Brain,
  Layers,
  Sparkles,
  Search,
  ChevronRight,
  ChevronLeft,
  CircleCheck,
  Award,
  Sword,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { safeGetItem, safeSetItem } from "@/lib/safe-client-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// --- Mock Data for Visualization ---
const studyStats = [
  { day: 'السبت', minutes: 120, target: 180 },
  { day: 'الأحد', minutes: 210, target: 180 },
  { day: 'الأثنين', minutes: 150, target: 180 },
  { day: 'الثلاثاء', minutes: 300, target: 180 },
  { day: 'الأربعاء', minutes: 180, target: 180 },
  { day: 'الخميس', minutes: 240, target: 180 },
  { day: 'الجمعة', minutes: 90, target: 180 },
];

const subjectSkills = [
  { subject: 'الرياضيات', level: 85, fullMark: 100 },
  { subject: 'الفيزياء', level: 92, fullMark: 100 },
  { subject: 'الكيمياء', level: 78, fullMark: 100 },
  { subject: 'الأحياء', level: 65, fullMark: 100 },
  { subject: 'اللغة العربية', level: 88, fullMark: 100 },
  { subject: 'اللغة الإنجليزية', level: 95, fullMark: 100 },
];

const progressPath = [
  { month: 'يناير', xp: 2000 },
  { month: 'فبراير', xp: 3500 },
  { month: 'مارس', xp: 5200 },
  { month: 'أبريل', xp: 6800 },
  { month: 'مايو', xp: 8500 },
  { month: 'يونيو', xp: 11000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl text-xs sm:text-sm">
        <p className="font-bold mb-1 text-gray-200">{label}</p>
        <p className="text-primary">{`الدقائق: ${payload[0].value} دقيقة`}</p>
        {payload[1] && <p className="text-amber-500">{`الهدف: ${payload[1].value} دقيقة`}</p>}
      </div>
    );
  }
  return null;
};

export default function ProgressPage() {
  const [summary, setSummary] = useState<{ totalMinutes: number; averageFocus: number; tasksCompleted: number; streakDays: number } | null>(null);
  const [activeTab, setActiveTab] = useState('skills');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const userId = await ensureUser();
        const res = await fetch(`/api/progress/summary?userId=${userId}`);
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch summary", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const totalXP = summary ? (summary.totalMinutes * 10 + summary.tasksCompleted * 100) : 0;
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center justify-between gap-6"
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
        </motion.div>

        {/* --- Stats Grid --- */}
        <div className="grid gap-6 md:grid-cols-4">
           {[
             { label: "إجمالي وقت التدريب", value: summary?.totalMinutes ?? 0, unit: "دقيقة", icon: Clock, color: "text-blue-400" },
             { label: "النشاط المستمر", value: summary?.streakDays ?? 0, unit: "يوم", icon: Flame, color: "text-orange-400" },
             { label: "معدل التركيز", value: summary?.averageFocus ?? 0, unit: "%", icon: Brain, color: "text-purple-400" },
             { label: "المهمات المنجزة", value: summary?.tasksCompleted ?? 0, unit: "مهمة", icon: Target, color: "text-emerald-400" },
           ].map((stat, idx) => (
             <motion.div
               key={idx}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: idx * 0.1 }}
               className={STYLES.glass + " p-6 group hover:border-primary/50 transition-all cursor-default"}
             >
                <div className="flex items-start justify-between">
                   <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-6 h-6" />
                   </div>
                   <div className="text-left font-black text-white/10 text-4xl group-hover:text-primary/10 transition-colors">0{idx+1}</div>
                </div>
                <div className="mt-8 space-y-1">
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{stat.value}</span>
                      <span className="text-gray-400 font-medium">{stat.unit}</span>
                   </div>
                </div>
             </motion.div>
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
                    <motion.div 
                      key="skills-radar"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={STYLES.glass + " lg:col-span-2 p-8"}
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
                       <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectSkills}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(156,163,175,0.8)', fontSize: 14 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                   name="مستوى المهارة"
                                   dataKey="level"
                                   stroke="#6366f1"
                                   fill="#6366f1"
                                   fillOpacity={0.4}
                                />
                                <RechartsTooltip contentStyle={{ background: '#000', border: '1px solid #333' }} />
                                <Legend />
                             </RadarChart>
                          </ResponsiveContainer>
                       </div>
                    </motion.div>

                    {/* Skill List Section */}
                    <motion.div 
                      key="skills-list"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
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
                                      <motion.div 
                                         initial={{ width: 0 }}
                                         animate={{ width: `${skill.level}%` }}
                                         transition={{ duration: 1, delay: idx * 0.1 }}
                                         className="h-full bg-gradient-to-r from-primary to-indigo-400"
                                      />
                                   </div>
                                </div>
                             </Card>
                          ))}
                       </div>
                       <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-gray-500 hover:text-white rounded-xl h-12">
                          عرض جميع المهارات
                       </Button>
                    </motion.div>
                 </div>
              </TabsContent>

              <TabsContent key="charts" value="charts" className="m-0 focus-visible:outline-none">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Activity Area Chart */}
                    <motion.div 
                      key="chart-activity"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={STYLES.glass + " p-8"}
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
                       <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={studyStats}>
                                <defs>
                                   <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMin)" />
                                <Line type="monotone" dataKey="target" stroke="rgba(245,158,11,0.3)" strokeDasharray="5 5" dot={false} />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </motion.div>

                    {/* Progression Line Chart */}
                    <motion.div 
                      key="chart-growth"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={STYLES.glass + " p-8"}
                    >
                       <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-2xl font-black">نمو الإمبراطورية (XP Growth)</h3>
                            <p className="text-gray-400">المعدل الشهري لاكتساب نقاط الخبرة</p>
                          </div>
                          <Sparkles className="text-amber-400 w-6 h-6" />
                       </div>
                       <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={progressPath}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
                                <RechartsTooltip />
                                <Line 
                                   type="stepAfter" 
                                   dataKey="xp" 
                                   stroke="#10b981" 
                                   strokeWidth={4} 
                                   dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#000' }}
                                   activeDot={{ r: 8, strokeWidth: 0 }}
                                />
                             </LineChart>
                          </ResponsiveContainer>
                       </div>
                    </motion.div>
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
                       {[
                         { title: "معركة الكيمياء النهائية", status: "نصر مبين", grade: "98/100", xp: "+500 XP", date: "منذ يومين", icon: CheckCircle },
                         { title: "ماراثون الفيزياء (4 ساعات)", status: "قدرة تحمل فائقة", grade: "S Rank", xp: "+800 XP", date: "منذ 4 أيام", icon: Zap },
                         { title: "تحدي القواعد اللغوية", status: "مكتمل", grade: "85/100", xp: "+200 XP", date: "منذ أسبوع", icon: BookOpen },
                       ].map((item, idx) => (
                         <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all">
                            <div className="flex items-center gap-6">
                               <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-primary">
                                  <item.icon className="w-6 h-6" />
                               </div>
                               <div className="space-y-1">
                                  <p className="font-bold text-lg">{item.title}</p>
                                  <div className="flex items-center gap-3 text-sm">
                                     <span className="text-emerald-400 font-bold">{item.status}</span>
                                     <span className="text-gray-600">•</span>
                                     <span className="text-gray-500">{item.date}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="font-black text-xl text-white">{item.grade}</p>
                               <p className="text-xs text-amber-500 font-black">{item.xp}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </TabsContent>
           </Tabs>

        {/* --- Footer Status --- */}
        <div className="flex justify-center pt-8 opacity-50">
           <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              تخمين استخباراتي: أنت على وشك الوصول للمستوى التالي خلال 3 أيام!
           </p>
        </div>
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return <CircleCheck {...props} />
}
