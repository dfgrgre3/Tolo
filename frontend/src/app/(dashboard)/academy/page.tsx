"use client";

import { useAuth } from "@/hooks/use-auth";
import { fetchCoursesListRaw } from "@/features/courses/api/courses-gateway";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
import { Badge } from "../../../components/ui/badge";import { useGamification } from "@/features/gamification";
import { logger } from '@/lib/logger';

interface DashboardCourse {
  id: string;
  /** Unique URL segment; present on current payloads, absent on cached older ones. */
  slug?: string;
  title?: string;
  name?: string;
  thumbnailUrl?: string;
  subject?: string;
  enrolled?: boolean;
  progress?: number;
  rating?: number;
  description?: string;
}

export default function GamifiedCoursesDashboard() {
  const router = useRouter();
  useAuth();
  const { userProgress } = useGamification();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "explore">("active");

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        const data = await fetchCoursesListRaw<{ items?: DashboardCourse[] }>();
        const fetchedCourses = Array.isArray(data?.items) ? data.items : [];
        setCourses(fetchedCourses);
      } catch (err) {
        logger.error("Failed to load dashboard courses", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyCourses();
  }, []);

  // Derived state
  const enrolledCourses = courses.filter((c) => c.enrolled);
  const activeQuests = enrolledCourses.filter((c) => (c.progress || 0) < 100);
  const completedQuests = enrolledCourses.filter((c) => (c.progress || 0) >= 100);
  const exploreCourses = courses.filter((c) => !c.enrolled).slice(0, 4); // Suggest 4

  const totalXP = userProgress?.totalXP || 0;
  const masteryLevel = userProgress?.level || 1;
  const examsPassedCount = userProgress?.examsPassed || 0;
  const currentStreak = userProgress?.currentStreak || 0;
  const tasksCompletedCount = userProgress?.tasksCompleted || 0;
  const studyTimeHours = Math.round((userProgress?.totalStudyTime || 0) / 60);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
      </div>);

  }

  return (
    <div className="space-y-8 " dir="rtl">
      {/* â”€â”€â”€ Stats Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Level Card */}
        <div>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-amber-500/20 shadow-[0_8px_32px_rgba(245,158,11,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-colors" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Ø±ØªØ¨Ø© Ø§Ù„Ù…Ø­Ø§Ø±Ø¨</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">Lv.{masteryLevel}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{totalXP} Ù†Ù‚Ø·Ø© Ø®Ø¨Ø±Ø© (XP)</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 transform group-hover:rotate-12 transition-transform">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Quests */}
        <div>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-blue-500/20 shadow-[0_8px_32px_rgba(59,130,246,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Ù…Ù‡Ø§Ù… Ø§Ù„ØªØ¯Ø±ÙŠØ¨</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{activeQuests.length}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ° Ø­Ø§Ù„ÙŠØ§Ù‹</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 transform group-hover:-rotate-12 transition-transform">
                <Sword className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Victories */}
        <div>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Ø§Ù†ØªØµØ§Ø±Ø§Øª</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{examsPassedCount}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Ø¯ÙˆØ±Ø§Øª Ù…ÙƒØªÙ…Ù„Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Streak */}
        <div>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-rose-500/20 shadow-[0_8px_32px_rgba(244,63,94,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Ø´Ø¹Ù„Ø© Ø§Ù„Ø­Ù…Ø§Ø³</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{currentStreak}</span>
                  <span className="text-sm font-bold text-muted-foreground">ÙŠÙˆÙ…</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø§Ù„Ù…ØªÙˆØ§ØµÙ„</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30 transform group-hover:rotate-12 transition-transform">
                <Flame className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                    
                    <Target className="h-4 w-4" /> Ø§Ù„Ù†Ø´Ø·Ø©
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "completed" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-muted-foreground hover:text-foreground"}`
                    }>
                    
                    <Trophy className="h-4 w-4" /> Ø§Ù„Ù…ÙƒØªÙ…Ù„Ø©
                  </button>
                  <button
                    onClick={() => setActiveTab("explore")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "explore" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"}`
                    }>
                    
                    <Star className="h-4 w-4" /> Ø§Ø³ØªÙƒØ´Ø§Ù
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 min-h-[400px]">
              <>
                
                {activeTab === "active" &&
                <div key="active" className="space-y-4">
                  
                    {activeQuests.length > 0 ?
                  activeQuests.map((course, _idx) =>
                  <div key={course.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border border-white/5 bg-muted/20 hover:bg-muted/40 transition-all hover:border-primary/30">
                          {/* Image */}
                          <div className="relative h-20 w-32 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                            {course.thumbnailUrl ?
                      <Image src={course.thumbnailUrl} alt={course.title ?? course.name ?? ""} fill sizes="128px" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" unoptimized /> :

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
                              <span>Ø§Ù„ØªÙ‚Ø¯Ù…</span>
                              <span className="font-black text-primary">{Math.round(course.progress || 0)}%</span>
                            </div>
                            <Progress value={course.progress || 0} className="h-2" />
                          </div>

                          {/* Action */}
                          <Button
                      onClick={() => router.push(course.slug ? `/courses/${course.slug}/learn` : `/learning/${course.id}`)}
                      className="w-full sm:w-auto mt-2 sm:mt-0 gap-2 rounded-xl bg-primary text-primary-foreground font-bold hover:shadow-lg hover:shadow-primary/30">
                      
                            Ù…ØªØ§Ø¨Ø¹Ø© <Play className="h-3 w-3 fill-current" />
                          </Button>
                        </div>
                  ) :

                  <div className="flex flex-col items-center justify-center text-center py-12">
                        <Target className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <h4 className="text-lg font-bold">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù… ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ù†Ø´Ø·Ø©</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">Ø§ÙƒØªØ´Ù Ù…Ø¹Ø³ÙƒØ±Ø§Øª Ø§Ù„ØªØ¯Ø±ÙŠØ¨ Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù„ØªØ·ÙˆÙŠØ± Ù…Ù‡Ø§Ø±Ø§ØªÙƒ!</p>
                        <Button onClick={() => setActiveTab("explore")} variant="outline" className="gap-2 rounded-xl">
                          <Star className="h-4 w-4" /> ØªØµÙØ­ Ø§Ù„Ø¯ÙˆØ±Ø§Øª
                        </Button>
                      </div>
                  }
                  </div>
                }

                {activeTab === "completed" &&
                <div key="completed" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                    {completedQuests.length > 0 ?
                  completedQuests.map((course) =>
                  <div key={course.id} className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-bl-3xl" />
                          <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-500" />
                          
                          <div className="mt-2 space-y-3">
                            <h3 className="font-bold text-base truncate">{course.title || course.name}</h3>
                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <Award className="h-4 w-4" /> ØªÙ… Ø§Ù„Ø¥Ù†Ø¬Ø§Ø² Ø¨Ù†Ø¬Ø§Ø­
                            </div>
                            <Button
                        variant="ghost"
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="w-full justify-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs font-bold">
                        
                              Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ø¹Ø³ÙƒØ± <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                  ) :

                  <div className="col-span-2 flex flex-col items-center justify-center text-center py-12">
                        <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <h4 className="text-lg font-bold">Ù„Ù… ØªÙ†Ø¬Ø² Ø£ÙŠ Ù…Ù‡Ø§Ù… ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ø¨Ø¹Ø¯</h4>
                        <p className="text-sm text-muted-foreground mt-1">Ø·Ø±ÙŠÙ‚ Ø§Ù„Ø£Ù„Ù Ù…ÙŠÙ„ ÙŠØ¨Ø¯Ø£ Ø¨Ø®Ø·ÙˆØ©. Ø£ÙƒÙ…Ù„ Ø¯ÙˆØ±Ø© Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø´Ø§Ø±Ø© Ø§Ù„Ù†ØµØ±.</p>
                      </div>
                  }
                  </div>
                }

                {activeTab === "explore" &&
                <div key="explore" className="grid grid-cols-1 gap-4">
                  
                    {exploreCourses.length > 0 ?
                  exploreCourses.map((course) =>
                  <div key={course.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-white/5 bg-background/50 hover:bg-muted/40 transition-colors">
                            <div className="relative h-24 w-full sm:w-40 rounded-xl overflow-hidden shrink-0">
                             {course.thumbnailUrl ?
                      <Image src={course.thumbnailUrl} alt={course.title ?? course.name ?? ""} fill sizes="(max-width: 640px) 100vw, 160px" className="w-full h-full object-cover" unoptimized /> :

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
                        
                                Ø§Ø³ØªÙƒØ´Ø§Ù
                             </Button>
                           </div>
                        </div>
                  ) :

                  <div className="flex flex-col items-center justify-center text-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <h4 className="text-lg font-bold">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯ÙˆØ±Ø§Øª Ø¬Ø¯ÙŠØ¯Ø© Ù…ØªØ§Ø­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹</h4>
                      </div>
                  }
                  </div>
                }

              </>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Stats & Quick links */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-primary/10 to-transparent border-primary/20 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(var(--primary),0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                 <Target className="h-5 w-5 text-primary" /> Ø§Ù„ØªØ¯Ø±ÙŠØ¨ Ø§Ù„Ù…ÙƒØ«Ù
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Ø§Ù„ØªÙ‚Ø¯Ù… Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ</span>
                  <span className="font-bold text-primary">65%</span>
                </div>
                <Progress value={Math.min(totalXP ? (totalXP % 1000) / 10 : 0, 100)} className="h-2 bg-primary/20" />
                <p className="text-[10px] text-muted-foreground text-left">3 Ø³Ø§Ø¹Ø§Øª Ù…ØªØ¨Ù‚ÙŠØ© Ù„ØªØ­Ù‚ÙŠÙ‚ Ø§Ù„Ù‡Ø¯Ù</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-xl p-3 border border-white/5 space-y-1">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  <p className="text-[10px] font-bold text-muted-foreground">Ø¯Ø±ÙˆØ³ Ù…ÙƒØªÙ…Ù„Ø©</p>
                  <p className="text-xl font-black">{tasksCompletedCount}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-3 border border-white/5 space-y-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <p className="text-[10px] font-bold text-muted-foreground">Ø³Ø§Ø¹Ø§Øª Ø§Ù„ØªØ¹Ù„Ù…</p>
                  <p className="text-xl font-black">{studyTimeHours}</p>
                </div>
              </div>

              <Button
                onClick={() => router.push("/courses")}
                className="w-full gap-2 rounded-xl h-11 bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">
                
                 <LayoutGrid className="h-4 w-4" /> ÙƒØªØ§Ù„ÙˆØ¬ Ø§Ù„Ø¯ÙˆØ±Ø§Øª
              </Button>
            </CardContent>
          </Card>

          {/* Achievement Badges miniture */}
          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl">
             <CardHeader className="pb-4">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Shield className="h-4 w-4 text-purple-500" /> Ø´Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø¬Ø¯
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
