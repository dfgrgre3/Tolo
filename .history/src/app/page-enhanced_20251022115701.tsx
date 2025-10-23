"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/shared/button";
import { Badge } from "@/shared/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Progress } from "@/shared/progress";
import { 
  Clock, 
  Flame, 
  CheckCircle2, 
  TrendingUp, 
  Target, 
  Zap, 
  Play, 
  Star, 
  BookOpen, 
  Users, 
  Brain, 
  Award, 
  ArrowRight, 
  Sparkles, 
  BarChart3, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Trophy,
  Plus,
  Bell,
  Activity,
  BookMarked
} from 'lucide-react';
import { useAuth } from "@/components/auth/UserProvider";

export default function EnhancedHomePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    totalMinutes: 45,
    averageFocus: 85,
    tasksCompleted: 12,
    streakDays: 5
  });

  const [courses, setCourses] = useState([
    {
      id: 1,
      title: "الرياضيات المتقدمة",
      progress: 65,
      nextLesson: "الجبر التفاعلي",
      time: "15 دقيقة",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: 2,
      title: "العلوم الطبيعية",
      progress: 40,
      nextLesson: "الكيمياء العضوية",
      time: "20 دقيقة",
      color: "from-green-500 to-green-600"
    },
    {
      id: 3,
      title: "اللغة العربية",
      progress: 80,
      nextLesson: "النحو والصرف",
      time: "10 دقيقة",
      color: "from-purple-500 to-purple-600"
    }
  ]);

  const [upcomingTasks, setUpcomingTasks] = useState([
    {
      id: 1,
      title: "حل تمارين الرياضيات",
      dueDate: "اليوم",
      priority: "high"
    },
    {
      id: 2,
      title: "مراجعة درس العلوم",
      dueDate: "غداً",
      priority: "medium"
    },
    {
      id: 3,
      title: "تحضير امتحان اللغة",
      dueDate: "بعد 3 أيام",
      priority: "low"
    }
  ]);

  const [recentAchievements, setRecentAchievements] = useState([
    {
      id: 1,
      title: "المذاكر المنتظم",
      description: "مداومة 5 أيام متتالية",
      icon: <Flame className="h-6 w-6" />,
      earnedAt: "اليوم"
    },
    {
      id: 2,
      title: "المتفوق",
      description: "إكمال 10 دروس",
      icon: <Star className="h-6 w-6" />,
      earnedAt: "الأمس"
    },
    {
      id: 3,
      title: "بطل التركيز",
      description: "تركيز أعلى من 80% لمدة أسبوع",
      icon: <Target className="h-6 w-6" />,
      earnedAt: "منذ 3 أيام"
    }
  ]);

  // مكون البطاقة الإحصائية
  const StatCard = ({ icon, title, value, unit, trend, color }: {
    icon: React.ReactNode;
    title: string;
    value: number | string;
    unit: string;
    trend?: string;
    color: string;
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold mt-2">{value} <span className="text-lg font-normal text-gray-500">{unit}</span></p>
            {trend && (
              <div className="flex items-center mt-2 text-green-600">
                <TrendingUp className="h-4 w-4 ml-1" />
                <span className="text-sm">{trend}</span>
              </div>
            )}
          </div>
          <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center text-white`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* الترحيب بالمستخدم */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">مرحباً، {user?.name || 'طالب'}! 👋</h1>
          <p className="text-gray-600 mt-1">هذا هو ملخص تقدمك اليوم. استمر في المذاكرة!</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-reverse space-x-3">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 ml-2" />
            إضافة مهمة جديدة
          </Button>
          <Button size="sm" variant="outline">
            <Bell className="h-4 w-4 ml-2" />
            الإشعارات
          </Button>
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Clock className="h-7 w-7" />}
          title="إجمالي ساعات الدراسة"
          value={Math.round(summary.totalMinutes / 60)}
          unit="ساعة"
          trend="+12% من الأسبوع الماضي"
          color="bg-blue-500"
        />
        <StatCard
          icon={<Flame className="h-7 w-7" />}
          title="أيام المداومة"
          value={summary.streakDays}
          unit="يوم"
          trend="رائع! استمر!"
          color="bg-orange-500"
        />
        <StatCard
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="المهام المكتملة"
          value={summary.tasksCompleted}
          unit="مهمة"
          trend="+3 من أمس"
          color="bg-purple-500"
        />
        <StatCard
          icon={<Target className="h-7 w-7" />}
          title="معدل التركيز"
          value={summary.averageFocus}
          unit="%"
          trend="+5% من الشهر الماضي"
          color="bg-green-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* المسارات التعليمية */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">مساراتك التعليمية</CardTitle>
              <Link href="/courses">
                <Button variant="outline" size="sm">
                  عرض جميع الدورات
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{course.title}</h3>
                      <Badge variant="secondary">{course.progress}% مكتمل</Badge>
                    </div>
                    <Progress value={course.progress} className="mb-3 h-2" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <BookMarked className="h-4 w-4 ml-1" />
                        <span>الدرس التالي: {course.nextLesson}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 ml-1" />
                        <span>{course.time}</span>
                      </div>
                      <Button size="sm" className={`bg-gradient-to-r ${course.color} hover:opacity-90`}>
                        استكمال
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* المهام القادمة */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">المهام القادمة</CardTitle>
            <CardDescription>مهامك ومواعيد استحقاقها</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-reverse space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.dueDate}</p>
                  </div>
                </div>
              ))}
              <Link href="/tasks">
                <Button variant="outline" className="w-full mt-3">
                  عرض جميع المهام
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الإنجازات الحديثة */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">إنجازاتك الحديثة</CardTitle>
          <Link href="/achievements">
            <Button variant="outline" size="sm">
              عرض جميع الإنجازات
              <ArrowRight className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentAchievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center space-x-reverse space-x-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white">
                  {achievement.icon}
                </div>
                <div>
                  <h3 className="font-medium">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{achievement.earnedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* قسم الإجراءات السريعة */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/ai">
              <Button variant="outline" className="h-full flex flex-col items-center justify-center py-6 space-y-2">
                <Brain className="h-8 w-8 text-blue-600" />
                <span>المساعد الذكي</span>
              </Button>
            </Link>
            <Link href="/exams">
              <Button variant="outline" className="h-full flex flex-col items-center justify-center py-6 space-y-2">
                <FileText className="h-8 w-8 text-green-600" />
                <span>امتحان تجريبي</span>
              </Button>
            </Link>
            <Link href="/schedule">
              <Button variant="outline" className="h-full flex flex-col items-center justify-center py-6 space-y-2">
                <Calendar className="h-8 w-8 text-purple-600" />
                <span>جدولة دراسة</span>
              </Button>
            </Link>
            <Link href="/forum">
              <Button variant="outline" className="h-full flex flex-col items-center justify-center py-6 space-y-2">
                <MessageSquare className="h-8 w-8 text-amber-600" />
                <span>المنتدى</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
