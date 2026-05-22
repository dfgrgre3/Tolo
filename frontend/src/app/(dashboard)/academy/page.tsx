"use client";

import React, { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import {
  BookOpen,
  Sword,
  Target,
  Trophy,
  Flame,

  Clock,
  ChevronRight,
  Shield,
  Star,
  Play,
  CheckCircle2,
  Crown,
  LayoutGrid,

  Award,
  BookMarked } from
"lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { Badge } from "../../../components/ui/badge";
import { useAuth } from "../../../contexts/auth-context";
import { logger } from '@/lib/logger';

export default function GamifiedCoursesDashboard() {
  const router = useRouter();
  const { user, fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "explore">("active");

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth("/api/courses");
        if (res.ok) {
          const data = await res.json();
          const fetchedCourses = Array.isArray(data.courses) ?
          data.courses :
          Array.isArray(data.subjects) ?
          data.subjects :
          [];
          setCourses(fetchedCourses);
        }
      } catch (err) {
        logger.error("Failed to load dashboard courses", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyCourses();
  }, [fetchWithAuth]);

  // Derived state
  const enrolledCourses = courses.filter((c) => c.enrolled);
  const activeQuests = enrolledCourses.filter((c) => (c.progress || 0) < 100);
  const completedQuests = enrolledCourses.filter((c) => (c.progress || 0) >= 100);
  const exploreCourses = courses.filter((c) => !c.enrolled).slice(0, 4); // Suggest 4

  const totalXP = user?.totalXP || 0;
  const masteryLevel = user?.level || 1;
  const examsPassedCount = user?.examsPassed || 0;
  const currentStreak = user?.currentStreak || 0;
  const tasksCompletedCount = user?.tasksCompleted || 0;
  const studyTimeHours = Math.round((user?.totalStudyTime || 0) / 60);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary/20" />
          <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          <Sword className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>);

  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* â”€â”€â”€ Stats Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <m.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, staggerChildren: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Level Card */}
        <m.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-amber-500/20 shadow-[0_8px_32px_rgba(245,158,11,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-colors" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">رتبة المحارب</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">Lv.{masteryLevel}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{totalXP} نقطة خبرة (XP)</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 transform group-hover:rotate-12 transition-transform">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Active Quests */}
        <m.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-blue-500/20 shadow-[0_8px_32px_rgba(59,130,246,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">مهام التدريب</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{activeQuests.length}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">قيد التنفيذ حالياً</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 transform group-hover:-rotate-12 transition-transform">
                <Sword className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Victories */}
        <m.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">انتصارات</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{examsPassedCount}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">دورات مكتملة بالكامل</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Streak */}
        <m.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-rose-500/20 shadow-[0_8px_32px_rgba(244,63,94,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">شعلة الحماس</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{currentStreak}</span>
                  <span className="text-sm font-bold text-muted-foreground">يوم</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">الالتزام المتواصل</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30 transform group-hover:rotate-12 transition-transform">
                <Flame className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </m.div>
      </m.div>

      {/* â”€â”€â”€ Main Content Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Lists */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex bg-muted/40 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "active" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`
                    }>
                    
                    <Target className="h-4 w-4" /> النشطة
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "completed" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-muted-foreground hover:text-foreground"}`
                    }>
                    
                    <Trophy className="h-4 w-4" /> المكتملة
                  </button>
                  <button
                    onClick={() => setActiveTab("explore")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "explore" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"}`
                    }>
                    
                    <Star className="h-4 w-4" /> استكشاف
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 min-h-[400px]">
              <AnimatePresence mode="wait">
                
                {activeTab === "active" &&
                <m.div
                  key="active"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4">
                  
                    {activeQuests.length > 0 ?
                  activeQuests.map((course, _idx) =>
                  <div key={course.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border border-white/5 bg-muted/20 hover:bg-muted/40 transition-all hover:border-primary/30">
                          {/* Image */}
                          <div className="relative h-20 w-32 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                            {course.thumbnailUrl ?
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> :

                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center">
                                <BookMarked className="h-6 w-6 text-primary/50" />
                              </div>
                      }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 w-full space-y-2">
                            <h3 className="font-bold text-foreground text-base truncate group-hover:text-primary transition-colors">
                              {course.title || course.name}
                            </h3>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>التقدم</span>
                              <span className="font-black text-primary">{Math.round(course.progress || 0)}%</span>
                            </div>
                            <Progress value={course.progress || 0} className="h-2" />
                          </div>

                          {/* Action */}
                          <Button
                      onClick={() => router.push(`/learning/${course.id}`)}
                      className="w-full sm:w-auto mt-2 sm:mt-0 gap-2 rounded-xl bg-primary text-primary-foreground font-bold hover:shadow-lg hover:shadow-primary/30">
                      
                            متابعة <Play className="h-3 w-3 fill-current" />
                          </Button>
                        </div>
                  ) :

                  <div className="flex flex-col items-center justify-center text-center py-12">
                        <Target className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <h4 className="text-lg font-bold">لا يوجد مهام تدريبية نشطة</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">اكتشف معسكرات التدريب الجديدة لتطوير مهاراتك!</p>
                        <Button onClick={() => setActiveTab("explore")} variant="outline" className="gap-2 rounded-xl">
                          <Star className="h-4 w-4" /> تصفح الدورات
                        </Button>
                      </div>
                  }
                  </m.div>
                }

                {activeTab === "completed" &&
                <m.div
                  key="completed"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                    {completedQuests.length > 0 ?
                  completedQuests.map((course) =>
                  <div key={course.id} className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-bl-3xl" />
                          <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-500" />
                          
                          <div className="mt-2 space-y-3">
                            <h3 className="font-bold text-base truncate">{course.title || course.name}</h3>
                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <Award className="h-4 w-4" /> تم الإنجاز بنجاح
                            </div>
                            <Button
                        variant="ghost"
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="w-full justify-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs font-bold">
                        
                              مراجعة المعسكر <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                  ) :

                  <div className="col-span-2 flex flex-col items-center justify-center text-center py-12">
                        <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <h4 className="text-lg font-bold">لم تنجز أي مهام تدريبية بعد</h4>
                        <p className="text-sm text-muted-foreground mt-1">طريق الألف ميل يبدأ بخطوة. أكمل دورة للحصول على شارة النصر.</p>
                      </div>
                  }
                  </m.div>
                }

                {activeTab === "explore" &&
                <m.div
                  key="explore"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 gap-4">
                  
                    {exploreCourses.length > 0 ?
                  exploreCourses.map((course) =>
                  <div key={course.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-white/5 bg-background/50 hover:bg-muted/40 transition-colors">
                           <div className="h-24 w-full sm:w-40 rounded-xl overflow-hidden shrink-0">
                            {course.thumbnailUrl ?
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" /> :

                      <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-indigo-400" />
                              </div>
                      }
                           </div>
                           <div className="flex-1 flex flex-col justify-center">
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="outline" className="text-[10px] font-bold tracking-wider">{course.subject}</Badge>
                                <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-current" /> {course.rating?.toFixed(1) || "5.0"}
                                </span>
                              </div>
                              <h3 className="font-bold text-lg mb-1">{course.title || course.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                           </div>
                           <div className="flex sm:flex-col justify-center items-center gap-2">
                             <Button
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="w-full rounded-xl">
                        
                                استكشاف
                             </Button>
                           </div>
                        </div>
                  ) :

                  <div className="flex flex-col items-center justify-center text-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <h4 className="text-lg font-bold">لا توجد دورات جديدة متاحة حالياً</h4>
                      </div>
                  }
                  </m.div>
                }

              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Stats & Quick links */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-primary/10 to-transparent border-primary/20 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(var(--primary),0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                 <Target className="h-5 w-5 text-primary" /> التدريب المكثف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">التقدم الأسبوعي</span>
                  <span className="font-bold text-primary">65%</span>
                </div>
                <Progress value={Math.min(user?.totalXP ? (user.totalXP % 1000) / 10 : 0, 100)} className="h-2 bg-primary/20" />
                <p className="text-[10px] text-muted-foreground text-left">3 ساعات متبقية لتحقيق الهدف</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-xl p-3 border border-white/5 space-y-1">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  <p className="text-[10px] font-bold text-muted-foreground">دروس مكتملة</p>
                  <p className="text-xl font-black">{tasksCompletedCount}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-3 border border-white/5 space-y-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <p className="text-[10px] font-bold text-muted-foreground">ساعات التعلم</p>
                  <p className="text-xl font-black">{studyTimeHours}</p>
                </div>
              </div>

              <Button
                onClick={() => router.push("/courses")}
                className="w-full gap-2 rounded-xl h-11 bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">
                
                 <LayoutGrid className="h-4 w-4" /> كتالوج الدورات
              </Button>
            </CardContent>
          </Card>

          {/* Achievement Badges miniture */}
          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl">
             <CardHeader className="pb-4">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Shield className="h-4 w-4 text-purple-500" /> شارات المجد
               </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="flex flex-wrap gap-3">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center relative group/badge">
                    <Trophy className="h-6 w-6 text-amber-500 drop-shadow-md" />
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center relative">
                    <Sword className="h-6 w-6 text-emerald-500 drop-shadow-md" />
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center relative">
                    <Target className="h-6 w-6 text-blue-500 drop-shadow-md" />
                  </div>
                  <div className="w-12 h-12 bg-muted/50 border border-dashed border-muted-foreground/30 rounded-2xl flex items-center justify-center relative">
                    <Crown className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                </div>
             </CardContent>
          </Card>

        </div>

      </div>
    </div>);

}