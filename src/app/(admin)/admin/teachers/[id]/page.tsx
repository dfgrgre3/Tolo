"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, BookOpen, Star, Calendar, Mail, Phone, Globe, 
  Edit, ArrowRight, Users, Trophy, TrendingUp 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { toast } from "sonner";

interface TeacherDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  subjectId: string;
  onlineUrl?: string;
  rating: number;
  notes?: string;
  createdAt: string;
  subject?: {
    id: string;
    name: string;
    nameAr?: string;
    color?: string;
  };
  stats?: {
    totalStudents: number;
    totalCourses: number;
    averageRating: number;
    totalHours: number;
  };
}

export default function AdminTeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "teachers", teacherId],
    queryFn: async () => {
      const response = await adminFetch(`${apiRoutes.admin.teachers}/${teacherId}`);
      if (!response.ok) throw new Error("Failed to fetch teacher details");
      return response.json();
    },
    enabled: !!teacherId,
  });

  const teacher: TeacherDetail | undefined = data?.teacher || data;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20" dir="rtl">
        <div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-bold">لم يتم العثور على المعلم</p>
          <AdminButton 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push("/admin/teachers")}
          >
            العودة لقائمة المعلمين
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <PageHeader
        title={`المعلم: ${teacher.name}`}
        description="عرض وتعديل بيانات المعلم وربطه بالمواد الدراسية."
      >
        <div className="flex items-center gap-3">
          <AdminButton
            variant="outline"
            icon={Edit}
            onClick={() => toast.info("تعديل بيانات المعلم قريباً")}
          >
            تعديل البيانات
          </AdminButton>
          <AdminButton
            variant="outline"
            icon={ArrowRight}
            onClick={() => router.push("/admin/teachers")}
          >
            العودة للقائمة
          </AdminButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatsCard
          title="إجمالي الطلاب"
          value={teacher.stats?.totalStudents || 0}
          icon={Users}
          color="blue"
          description="طالب مسجل"
        />
        <AdminStatsCard
          title="إجمالي الدورات"
          value={teacher.stats?.totalCourses || 0}
          icon={BookOpen}
          color="green"
          description="دورة دراسية"
        />
        <AdminStatsCard
          title="متوسط التقييم"
          value={teacher.rating || 0}
          icon={Star}
          color="yellow"
          description="من 5 نجوم"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teacher Info Card */}
        <div className="lg:col-span-1">
          <div className="admin-glass p-6 rounded-[2rem] border border-white/10">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-24 w-24 border-4 border-primary/20 mb-4">
                <AvatarImage src={teacher.avatar || ""} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {teacher.name?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-black">{teacher.name}</h3>
              <p className="text-sm text-muted-foreground">{teacher.email}</p>
              {teacher.subject && (
                <Badge className="mt-2" style={{ backgroundColor: teacher.subject.color + '20', color: teacher.subject.color }}>
                  {teacher.subject.nameAr || teacher.subject.name}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {teacher.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{teacher.phone}</span>
                </div>
              )}
              {teacher.onlineUrl && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={teacher.onlineUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    الرابط الشخصي
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  انضم في {new Date(teacher.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
              <TabsTrigger value="overview" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger value="courses" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">
                الدورات
              </TabsTrigger>
              <TabsTrigger value="performance" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-500">
                الأداء
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="admin-glass p-6 rounded-[2rem] border border-white/10">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  إحصائيات الأداء
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-accent/20 rounded-xl">
                    <p className="text-2xl font-black text-primary">{teacher.stats?.totalHours || 0}</p>
                    <p className="text-xs text-muted-foreground font-bold">ساعة تدريس</p>
                  </div>
                  <div className="p-4 bg-accent/20 rounded-xl">
                    <p className="text-2xl font-black text-green-500">{teacher.stats?.averageRating || teacher.rating || 0}</p>
                    <p className="text-xs text-muted-foreground font-bold">تقييم الطلاب</p>
                  </div>
                </div>
              </div>

              {teacher.notes && (
                <div className="admin-glass p-6 rounded-[2rem] border border-white/10">
                  <h3 className="text-lg font-black mb-4">ملاحظات</h3>
                  <p className="text-sm text-muted-foreground">{teacher.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="courses" className="space-y-6">
              <div className="admin-glass p-6 rounded-[2rem] border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    الدورات المسندة
                  </h3>
                  <AdminButton
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("إضافة دورة جديدة قريباً")}
                  >
                    إضافة دورة
                  </AdminButton>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لم يتم إضافة دورات بعد</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="admin-glass p-6 rounded-[2rem] border border-white/10">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  تقييم الأداء
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-accent/20 rounded-xl">
                    <span className="font-bold">تقييم عام</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-5 w-5 ${star <= (teacher.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}