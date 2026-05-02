"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  ArrowRight,
  Mail,
  Phone,
  Calendar,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Star,
  TrendingUp,
  Shield,
  CheckCircle,
  XCircle,
  Hash,

  School,
  User as UserIcon,
  Activity,
  Award,
  Settings,
  ShieldCheck,
  Zap,
  History,
  Trash2,
  Lock,
  Edit,
  Save,
  Crown,
  ShieldAlert,
  Flame
} from "lucide-react";
import { toast } from "sonner";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminBadge } from "@/components/admin/ui/admin-badge";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";
import { logger } from '@/lib/logger';
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface UserDetails {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string;
  emailVerified: boolean | null;
  phone: string | null;
  phoneVerified: boolean | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  pomodoroSessions: number;
  deepWorkSessions: number;
  studyXP: number;
  taskXP: number;
  examXP: number;
  challengeXP: number;
  questXP: number;
  seasonXP: number;
  gradeLevel: string | null;
  educationType: string | null;
  section: string | null;
  interestedSubjects: string[];
  studyGoal: string | null;
  bio: string | null;
  school: string | null;
  country: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  _count: {
    tasks: number;
    studySessions: number;
    achievements: number;
    notifications: number;
    examResults: number;
    subjectEnrollments: number;
    customGoals: number;
    reminders: number;
    sessions: number;
  };
  achievements: Array<{
    id: string;
    earnedAt: string;
    achievement: {
      title: string;
      icon: string;
      xpReward: number;
    };
  }>;
  examResults: Array<{
    id: string;
    score: number;
    takenAt: string;
    exam: {
      title: string;
      subject: {
        name: string;
      };
    };
  }>;
  studySessions: Array<{
    id: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    focusScore: number;
    subject: {
      name: string;
    } | null;
  }>;
}

const roleColors: Record<string, string> = {
  ADMIN: "bg-danger shadow-danger/20 text-white",
  TEACHER: "bg-primary shadow-primary/20 text-white",
  STUDENT: "bg-success shadow-success/20 text-white",
  MODERATOR: "bg-warning shadow-warning/20 text-white",
  USER: "bg-secondary shadow-secondary/20 text-white"
};

const roleLabels: Record<string, string> = {
  ADMIN: "مدير",
  TEACHER: "معلم",
  STUDENT: "طالب",
  MODERATOR: "مشرف",
  USER: "مستخدم"
};

const gradeLabels: Record<string, string> = {
  "GRADE_1": "الصف الأول",
  "GRADE_2": "الصف الثاني",
  "GRADE_3": "الصف الثالث",
  "GRADE_4": "الصف الرابع",
  "GRADE_5": "الصف الخامس",
  "GRADE_6": "الصف السادس",
  "PREP_1": "الأول الإعدادي",
  "PREP_2": "الثاني الإعدادي",
  "PREP_3": "الثالث الإعدادي",
  "SEC_1": "الأول الثانوي",
  "SEC_2": "الثاني الثانوي",
  "SEC_3": "الثالث الثانوي"
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [editedUser, setEditedUser] = React.useState<Partial<UserDetails>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const { playSound } = usePremiumSounds();

  const fetchUser = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setEditedUser(data);
      } else {
        toast.error("المستخدم غير موجود");
        router.push("/admin/users");
      }
    } catch (error) {
      logger.error("Error fetching user:", error);
      toast.error("حدث خطأ أثناء جلب بيانات المستخدم");
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpdate = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedUser)
      });

      if (response.ok) {
        toast.success("تم تحديث بيانات المستخدم بنجاح");
        setIsEditing(false);
        fetchUser();
      } else {
        const data = await response.json();
        toast.error(data.message || "حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      logger.error("Error updating user:", error);
      toast.error("حدث خطأ أثناء تحديث بيانات المستخدم");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        toast.success("تم حذف المستخدم بنجاح");
        router.push("/admin/users");
      } else {
        toast.error("حدث خطأ أثناء حذف المستخدم");
      }
    } catch (error) {
      logger.error("Error deleting user:", error);
      toast.error("حدث خطأ في الاتصال بالخادم");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-5 w-80 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="h-11 w-36 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1 space-y-8">
            <div className="rounded-2xl border bg-card p-8 flex flex-col items-center gap-6">
              <div className="h-32 w-32 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2 w-full">
                <div className="h-7 w-3/4 mx-auto bg-muted animate-pulse rounded" />
                <div className="h-5 w-1/2 mx-auto bg-muted animate-pulse rounded" />
              </div>
              <div className="h-8 w-24 bg-muted animate-pulse rounded-full" />
            </div>
          </div>
          <div className="lg:col-span-3 space-y-8">
            <div className="grid gap-6 md:grid-cols-4">
              {[...Array(4)].map((_, i) =>
              <div key={i} className="rounded-2xl border bg-card p-6 space-y-4">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              )}
            </div>
            <div className="h-96 w-full bg-muted animate-pulse rounded-2xl border" />
          </div>
        </div>
      </div>);

  }

  if (!user) return null;

  const xpToNextLevel = user.level * 1000 - user.totalXP % 1000;
  const levelProgress = user.totalXP % 1000 / 1000 * 100;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={user.name || "تفاصيل المستخدم"}
          description={`إدارة بيانات ونشاط ${user.name || user.email}`}
          className="p-0" />
        
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" className="rounded-2xl border-white/10" onClick={() => router.push("/admin/users")} icon={ArrowRight}>
            قائمة المستخدمين
          </AdminButton>
          <AdminButton
            variant="destructive"
            className="rounded-2xl shadow-xl shadow-danger/20"
            onClick={() => setDeleteDialogOpen(true)}
            icon={Trash2}
          >
            حذف المستخدم
          </AdminButton>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="border-none shadow-2xl bg-gradient-to-b from-card to-card/50 overflow-hidden admin-glass">
            <div className="h-32 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent relative overflow-hidden">
               <div className="absolute inset-0 opacity-10 bg-[url('/patterns/topography.svg')] bg-repeat" />
               <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            </div>
            <div className="px-6 pb-8 text-center -mt-16 flex flex-col items-center">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  <AvatarImage src={user.avatar || undefined} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.emailVerified &&
                <div className="absolute bottom-1 right-1 bg-background rounded-full p-1 border shadow-sm">
                    <CheckCircle className="h-6 w-6 text-success fill-success/10" />
                  </div>
                }
              </div>
              
              <div className="mt-6 space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {user.name || "مستخدم غير معروف"}
                </CardTitle>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium">@{user.username || "بدون_اسم"}</span>
                </div>
              </div>

              <div className="mt-6 w-full space-y-4">
                <div className="flex flex-wrap justify-center gap-2">
                  <AdminBadge color={user.role === 'ADMIN' ? 'red' : user.role === 'TEACHER' ? 'blue' : 'green'} variant="solid" className="px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]">
                    {roleLabels[user.role] || user.role}
                  </AdminBadge>
                  {user.gradeLevel &&
                    <AdminBadge color="purple" variant="outline" className="px-4 py-1.5 rounded-full font-black text-[10px] border-white/10">
                      {gradeLabels[user.gradeLevel] || user.gradeLevel}
                    </AdminBadge>
                  }
                </div>

                <div className="pt-6 border-t w-full space-y-4 text-right">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    </div>
                  </div>

                  {user.phone &&
                  <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{user.phone}</p>
                        <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                      </div>
                    </div>
                  }

                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {format(new Date(user.createdAt), "d MMMM yyyy", { locale: ar })}
                      </p>
                      <p className="text-xs text-muted-foreground">تاريخ الانضمام</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-primary">المستوى {user.level}</span>
                  <span className="text-xs text-muted-foreground">{xpToNextLevel} XP للمستوى القادم</span>
                </div>
                <Progress value={levelProgress} className="h-2 rounded-full bg-primary/10" />
              </div>
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl gap-2 h-11"
                onClick={() => setActiveTab("settings")}>
                
                <Edit className="h-4 w-4" />
                تعديل البيانات
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl gap-2 h-11">
                <Lock className="h-4 w-4" />
                تغيير كلمة المرور
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl gap-2 h-11" onClick={() => router.push("/admin/users/permissions")}>
                <ShieldCheck className="h-4 w-4" />
                إدارة الصلاحيات
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Areas */}
        <div className="lg:col-span-3 space-y-8">
          {/* Dashboard Stats */}
          <div className="grid gap-6 md:grid-cols-4">
            {[
            { label: "إجمالي الخبرة (XP)", value: user.totalXP.toLocaleString(), icon: Flame, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "التتابع الحالي", value: user.currentStreak, icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "ساعات المذاكرة", value: Math.floor(user.totalStudyTime / 60), icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "الاختبارات المجتازة", value: user.examsPassed, icon: Crown, color: "text-purple-500", bg: "bg-purple-500/10" }].
            map((stat, i) =>
            <Card key={i} className="border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden relative group hover:scale-[1.02] transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                </CardContent>
                <div className={`absolute bottom-0 left-0 h-1.5 w-full scale-x-0 group-hover:scale-x-100 transition-transform origin-right ${stat.bg.replace('/10', '')} opacity-50`} />
              </Card>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="bg-card p-1.5 rounded-2xl border shadow-sm inline-flex w-full md:w-auto">
              <TabsList className="bg-transparent h-10 w-full md:w-auto">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <Activity className="h-4 w-4" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger value="academic" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <BookOpen className="h-4 w-4" />
                  الأداء الأكاديمي
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <History className="h-4 w-4" />
                  سجل النشاط
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <Settings className="h-4 w-4" />
                  الإعدادات
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Bio Section */}
              {user.bio &&
              <Card className="border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-primary" />
                      نبذة تعريفية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {user.bio}
                    </p>
                  </CardContent>
                </Card>
              }

              <div className="grid gap-8 md:grid-cols-2">
                {/* XP Distribution */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      توزيع نقاط الخبرة (XP)
                    </CardTitle>
                    <CardDescription>تحليل لمصادر نقاط الخبرة التي اكتسبها المستخدم</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                    { label: "الدراسة", value: user.studyXP, color: "bg-blue-500" },
                    { label: "المهام", value: user.taskXP, color: "bg-green-500" },
                    { label: "الامتحانات", value: user.examXP, color: "bg-purple-500" },
                    { label: "التحديات", value: user.challengeXP, color: "bg-orange-500" },
                    { label: "الموسم", value: user.seasonXP, color: "bg-red-500" }].
                    map((xp, i) =>
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>{xp.label}</span>
                          <span>{xp.value.toLocaleString()} XP</span>
                        </div>
                        <Progress
                        value={xp.value / (user.totalXP || 1) * 100}
                        className={`h-2 rounded-full bg-muted`} />
                      
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Engagement Stats */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      مؤشرات التفاعل
                    </CardTitle>
                    <CardDescription>نظرة مفصلة على تفاعل المستخدم مع المنصة</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {[
                      { label: "المهام المكتملة", value: user.tasksCompleted, total: user._count.tasks, icon: CheckCircle, color: "text-green-500" },
                      { label: "جلسات المذاكرة", value: user._count.studySessions, icon: BookOpen, color: "text-blue-500" },
                      { label: "جلسات بومودورو", value: user.pomodoroSessions, icon: Clock, color: "text-orange-500" },
                      { label: "أطول تتابع", value: `${user.longestStreak} يوم`, icon: Trophy, color: "text-yellow-500" },
                      { label: "الإنجازات", value: user._count.achievements, icon: Award, color: "text-purple-500" }].
                      map((item, i) =>
                      <div key={i} className="flex items-center justify-between p-4 px-6">
                          <div className="flex items-center gap-3">
                            <item.icon className={`h-5 w-5 ${item.color}`} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <span className="font-bold">{item.value}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Achievements */}
              <Card className="border-none shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    آخر الإنجازات
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="rounded-xl">عرض الكل</Button>
                </CardHeader>
                <CardContent>
                  {user.achievements.length > 0 ?
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {user.achievements.map((item) =>
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                            <Trophy className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{item.achievement.title}</p>
                            <p className="text-xs text-primary font-medium">+{item.achievement.xpReward} XP</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(item.earnedAt), "d MMM yyyy", { locale: ar })}
                            </p>
                          </div>
                        </div>
                    )}
                    </div> :

                  <div className="text-center py-10 text-muted-foreground">
                      لا توجد إنجازات مسجلة حالياً
                    </div>
                  }
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academic" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Exam Results */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    نتائج الاختبارات الأخيرة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-muted/50 text-xs font-bold uppercase text-muted-foreground">
                        <tr>
                          <th className="px-6 py-4">الاختبار</th>
                          <th className="px-6 py-4">المادة</th>
                          <th className="px-6 py-4">الدرجة</th>
                          <th className="px-6 py-4 text-center">الحالة</th>
                          <th className="px-6 py-4">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {user.examResults.length > 0 ?
                        user.examResults.map((result) =>
                        <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-bold text-sm">{result.exam.title}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{result.exam.subject.name}</td>
                              <td className="px-6 py-4">
                                <span className={`text-lg font-black ${result.score >= 50 ? 'text-success' : 'text-danger'}`}>
                                  {result.score}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge variant={result.score >= 50 ? "secondary" : "destructive"} className="rounded-full px-3">
                                  {result.score >= 50 ? "ناجح" : "راسب"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                {format(new Date(result.takenAt), "d MMM yyyy", { locale: ar })}
                              </td>
                            </tr>
                        ) :

                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                              لا توجد نتائج اختبارات مسجلة حالياً
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Study Info */}
              <div className="grid gap-8 md:grid-cols-2">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">بيانات التعليم</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-xs text-muted-foreground mb-1">المرحلة الدراسية</p>
                        <p className="font-bold">{gradeLabels[user.gradeLevel || ""] || user.gradeLevel || "غير محدد"}</p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-xs text-muted-foreground mb-1">نوع التعليم</p>
                        <p className="font-bold">{user.educationType || "عام"}</p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-xs text-muted-foreground mb-1">الشعبة</p>
                        <p className="font-bold">{user.section || "غير محدد"}</p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-xs text-muted-foreground mb-1">المدرسة</p>
                        <p className="font-bold truncate" title={user.school || ""}>{user.school || "غير محدد"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">المواد المهتم بها</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {user.interestedSubjects.length > 0 ?
                      user.interestedSubjects.map((subject, i) =>
                      <Badge key={i} variant="outline" className="px-4 py-1.5 rounded-xl border-primary/20 bg-primary/5 text-primary">
                            {subject}
                          </Badge>
                      ) :

                      <p className="text-muted-foreground italic text-sm">لا توجد مواد مختارة</p>
                      }
                    </div>
                    {user.studyGoal &&
                    <div className="mt-6 p-4 rounded-2xl bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">هدف الدراسة</p>
                        <p className="text-sm italic font-medium">"{user.studyGoal}"</p>
                      </div>
                    }
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Recent Study Sessions */}
               <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    جلسات المذاكرة الأخيرة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {user.studySessions.length > 0 ?
                    user.studySessions.map((session) =>
                    <div key={session.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                              <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-bold">{session.subject?.name || "مذاكرة عامة"}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.startTime), "d MMMM yyyy HH:mm", { locale: ar })}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1 justify-end">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-bold">{session.durationMin} دقيقة</span>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-muted-foreground">درجة التركيز:</span>
                              <span className={`text-sm font-bold ${session.focusScore >= 80 ? 'text-success' : 'text-warning'}`}>
                                {session.focusScore}%
                              </span>
                            </div>
                          </div>
                        </div>
                    ) :

                    <div className="text-center py-10 text-muted-foreground">
                        لا توجد جلسات مذاكرة مسجلة
                      </div>
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Login History / Status */}
              <div className="grid gap-8 md:grid-cols-2">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">حالة الحساب والأمان</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
                      <div className="flex items-center gap-3">
                        {user.emailVerified ?
                        <div className="h-8 w-8 rounded-full bg-success/10 text-success flex items-center justify-center">
                            <CheckCircle className="h-4 w-4" />
                          </div> :

                        <div className="h-8 w-8 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                            <XCircle className="h-4 w-4" />
                          </div>
                        }
                        <span className="text-sm font-medium">البريد الإلكتروني</span>
                      </div>
                      <Badge variant={user.emailVerified ? "secondary" : "destructive"}>
                        {user.emailVerified ? "موثق" : "غير موثق"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${user.twoFactorEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">التحقق الثنائي</span>
                      </div>
                      <Badge variant={user.twoFactorEnabled ? "secondary" : "outline"}>
                        {user.twoFactorEnabled ? "مفعّل" : "معطّل"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">آخر تسجيل دخول</span>
                      </div>
                      <span className="text-sm font-bold">
                        {user.lastLogin ? format(new Date(user.lastLogin), "d MMM yyyy", { locale: ar }) : "لم يسبق"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">إحصائيات إضافية</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">عدد التنبيهات</span>
                        <span className="font-bold">{user._count.notifications}</span>
                     </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">المهام الجاري تنفيذها</span>
                        <span className="font-bold">{user._count.customGoals}</span>
                     </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">عدد الجلسات النشطة</span>
                        <span className="font-bold">{user._count.sessions}</span>
                     </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                       <Shield className="h-5 w-5 text-primary" />
                       إعدادات الحساب والصلاحيات
                    </CardTitle>
                    <CardDescription>تعديل الدور والصلاحيات الأساسية للمستخدم</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                           <label className="text-sm font-bold">دور المستخدم</label>
                           <Select value={editedUser.role || user.role} onValueChange={(val) => setEditedUser({ ...editedUser, role: val })}>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STUDENT">طالب</SelectItem>
                                <SelectItem value="TEACHER">معلم</SelectItem>
                                <SelectItem value="ADMIN">مدير</SelectItem>
                                <SelectItem value="MODERATOR">مشرف</SelectItem>
                              </SelectContent>
                           </Select>
                           <p className="text-xs text-muted-foreground mt-1">تغيير الدور سيؤثر على الصلاحيات التي يمتلكها المستخدم في المنصة.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold">المرحلة الدراسية</label>
                            <Select value={editedUser.gradeLevel || ""} onValueChange={(val) => setEditedUser({ ...editedUser, gradeLevel: val })}>
                               <SelectTrigger className="h-12 rounded-xl">
                                 <SelectValue placeholder="اختر المرحلة" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="أولى إعدادي">أولى إعدادي</SelectItem>
                                 <SelectItem value="ثانية إعدادي">ثانية إعدادي</SelectItem>
                                 <SelectItem value="ثالثة إعدادي">ثالثة إعدادي</SelectItem>
                                 <SelectItem value="أولى ثانوي">أولى ثانوي</SelectItem>
                                 <SelectItem value="ثانية ثانوي">ثانية ثانوي</SelectItem>
                                 <SelectItem value="ثالثة ثانوي">ثالثة ثانوي</SelectItem>
                               </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-6">
                        <h4 className="font-bold text-sm">بيانات الملف الشخصي</h4>
                        <div className="grid gap-6 md:grid-cols-2">
                           <div className="space-y-2">
                              <label className="text-sm font-medium">الاسم الكامل</label>
                              <div className="relative">
                                 <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <input
                            className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                            value={editedUser.name || ""}
                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                            placeholder="الاسم الكامل" />
                          
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-medium">البريد الإلكتروني</label>
                              <div className="relative">
                                 <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <input
                            className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                            value={editedUser.email || ""}
                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                            placeholder="البريد الإلكتروني" />
                          
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-medium">اسم المستخدم</label>
                              <div className="relative">
                                 <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <input
                            className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                            value={editedUser.username || ""}
                            onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                            placeholder="اسم المستخدم" />
                          
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-medium">رقم الهاتف</label>
                              <div className="relative">
                                 <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <input
                            className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                            value={editedUser.phone || ""}
                            onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                            placeholder="رقم الهاتف" />
                          
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-medium">المدرسة</label>
                              <div className="relative">
                                 <School className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <input
                            className="w-full h-11 pr-10 rounded-xl border bg-muted/50 px-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                            value={editedUser.school || ""}
                            onChange={(e) => setEditedUser({ ...editedUser, school: e.target.value })}
                            placeholder="اسم المدرسة" />
                          
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-medium">نوع التعليم</label>
                              <Select value={editedUser.educationType || ""} onValueChange={(val) => setEditedUser({ ...editedUser, educationType: val })}>
                                 <SelectTrigger className="h-11 rounded-xl">
                                   <SelectValue placeholder="اختر النوع" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="عام">عام</SelectItem>
                                   <SelectItem value="أزهري">أزهري</SelectItem>
                                   <SelectItem value="دولي">دولي</SelectItem>
                                   <SelectItem value="IG">IG</SelectItem>
                                   <SelectItem value="American">American</SelectItem>
                                   <SelectItem value="أخرى">أخرى</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                           <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium">نبذة تعريفية (Bio)</label>
                              <textarea
                          className="w-full h-24 rounded-xl border bg-muted/50 p-4 text-sm focus:ring-2 ring-primary/20 outline-none transition-all resize-none"
                          value={editedUser.bio || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                          placeholder="اكتب نبذة عن المستخدم..." />
                        
                           </div>
                        </div>

                        <div className="flex justify-start gap-3 pt-4">
                           <Button
                        className="rounded-xl px-8 shadow-lg shadow-primary/20"
                        onClick={handleUpdate}>
                        
                              <Save className="ml-2 h-4 w-4" />
                              حفظ التغييرات
                           </Button>
                           <Button
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedUser(user);
                        }}>
                        
                              إلغاء
                           </Button>
                        </div>
                    </div>
                  </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <AdminConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="حذف المستخدم نهائياً؟"
        description="هل أنت متأكد من حذف هذا المستخدم؟ سيتم مسح جميع بياناته ونشاطه من المنصة ولا يمكن التراجع عن هذا الإجراء."
        confirmText="تأكيد الحذف"
        variant="destructive"
      />
    </div>);

}
