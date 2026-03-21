"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";

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
  ADMIN: "bg-red-500",
  TEACHER: "bg-blue-500",
  STUDENT: "bg-green-500",
  MODERATOR: "bg-yellow-500",
  USER: "bg-gray-500",
};

const roleLabels: Record<string, string> = {
  ADMIN: "مدير",
  TEACHER: "معلم",
  STUDENT: "طالب",
  MODERATOR: "مشرف",
  USER: "مستخدم",
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserDetails | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          toast.error("المستخدم غير موجود");
          router.push("/admin/users");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("حدث خطأ أثناء جلب بيانات المستخدم");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, router]);

  const handleRoleChange = async (role: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        toast.success("تم تحديث دور المستخدم بنجاح");
        if (user) {
          setUser({ ...user, role });
        }
      } else {
        toast.error("حدث خطأ أثناء تحديث دور المستخدم");
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("حدث خطأ أثناء تحديث دور المستخدم");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
                  <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="h-6 w-36 bg-muted animate-pulse rounded" />
              <div className="grid gap-4 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name || "تفاصيل المستخدم"}
        description={user.email}
      >
        <Button variant="outline" onClick={() => router.push("/admin/users")}>
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة للقائمة
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{user.name || "بدون اسم"}</CardTitle>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className="mt-2">
                <Badge className={`${roleColors[user.role]} text-white`}>
                  {roleLabels[user.role] || user.role}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="flex items-center gap-2">
                  {user.email}
                  {user.emailVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">الهاتف</p>
                  <p className="flex items-center gap-2">
                    {user.phone}
                    {user.phoneVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">التحقق الثنائي</p>
                <p>{user.twoFactorEnabled ? "مفعّل" : "معطّل"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                <p>{new Date(user.createdAt).toLocaleDateString("ar-EG")}</p>
              </div>
            </div>

            {user.lastLogin && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">آخر تسجيل دخول</p>
                  <p>{new Date(user.lastLogin).toLocaleDateString("ar-EG")}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Role Selector */}
            <div>
              <p className="text-sm font-medium mb-2">تغيير الدور</p>
              <Select value={user.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">طالب</SelectItem>
                  <SelectItem value="TEACHER">معلم</SelectItem>
                  <SelectItem value="ADMIN">مدير</SelectItem>
                  <SelectItem value="MODERATOR">مشرف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* XP and Level */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Star className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{user.totalXP.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">XP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">المستوى {user.level}</p>
                    <p className="text-sm text-muted-foreground">المستوى الحالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{user.currentStreak}</p>
                    <p className="text-sm text-muted-foreground">تتابع حالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{user.tasksCompleted}</p>
                    <p className="text-sm text-muted-foreground">مهام مكتملة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Stats */}
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات النشاط</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">ساعات الدراسة</p>
                  <p className="text-xl font-bold">{Math.floor(user.totalStudyTime / 60)} ساعة</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">جلسات بومودورو</p>
                  <p className="text-xl font-bold">{user.pomodoroSessions}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">امتحانات مجتازة</p>
                  <p className="text-xl font-bold">{user.examsPassed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* XP Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع XP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">دراسة</span>
                  <span className="font-medium">{user.studyXP}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مهام</span>
                  <span className="font-medium">{user.taskXP}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">امتحانات</span>
                  <span className="font-medium">{user.examXP}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تحديات</span>
                  <span className="font-medium">{user.challengeXP}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مهام</span>
                  <span className="font-medium">{user.questXP}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">موسم</span>
                  <span className="font-medium">{user.seasonXP}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>آخر الإنجازات</CardTitle>
            </CardHeader>
            <CardContent>
              {user.achievements.length > 0 ? (
                <div className="space-y-3">
                  {user.achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{achievement.achievement.title}</p>
                          <p className="text-sm text-muted-foreground">
                            +{achievement.achievement.xpReward} XP
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(achievement.earnedAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد إنجازات بعد</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Exam Results */}
          <Card>
            <CardHeader>
              <CardTitle>آخر نتائج الامتحانات</CardTitle>
            </CardHeader>
            <CardContent>
              {user.examResults.length > 0 ? (
                <div className="space-y-3">
                  {user.examResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                          <BookOpen className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">{result.exam.title}</p>
                          <p className="text-sm text-muted-foreground">{result.exam.subject.name}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{result.score}%</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(result.takenAt).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد نتائج امتحانات بعد</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
