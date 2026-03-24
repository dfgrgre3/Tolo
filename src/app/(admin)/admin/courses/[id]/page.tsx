"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Clock,
  PlayCircle,
  GraduationCap,
  BarChart3,
  MessageCircle,
  DollarSign,
  Star,
  ExternalLink,
  Edit,
  Trash2 } from
"lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";

interface Course {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  price: number;
  level: string;
  instructorName: string | null;
  instructorId: string | null;
  categoryId: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  isActive: boolean;
  isPublished: boolean;
  durationHours: number;
  requirements: string | null;
  learningObjectives: string | null;
  _count: {
    enrollments: number;
    topics: number;
    reviews: number;
  };
  rating: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CourseStats {
  totalLessons: number;
  totalDuration: number;
  avgRating: number;
  reviewCount: number;
  enrollmentCount: number;
}

export default function CourseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [deleteDialog, setDeleteDialog] = React.useState<{open: boolean;id: string | null;}>({
    open: false,
    id: null
  });

  const { data: course, isLoading, refetch } = useQuery({
    queryKey: ["admin", "course", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}`);
      const result = await response.json();
      return result.data?.course as Course;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "course-stats", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/stats`);
      const result = await response.json();
      return result.data?.stats as CourseStats;
    },
    enabled: !!course
  });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id })
      });

      if (response.ok) {
        toast.success("تم حذف الدورة بنجاح");
        router.push("/admin/courses");
      } else {
        toast.error("فشل في حذف الدورة");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>);

  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold text-muted-foreground">الدورة غير موجودة</h3>
        <p className="text-muted-foreground mt-2">يرجى التحقق من المعرف المدخل والمحاولة مرة أخرى</p>
      </div>);

  }

  const colors: Record<string, string> = {
    EASY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    HARD: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    EXPERT: "bg-rose-500/10 text-rose-500 border-rose-500/20"
  };
  const labels: Record<string, string> = { EASY: "مبتدئ", MEDIUM: "متوسط", HARD: "متقدم", EXPERT: "خبير" };
  const level = (course.level || "MEDIUM") as string;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <PageHeader
        title={course.nameAr || course.name}
        description="إدارة تفاصيل الدورة، المحتوى، والطلاب المسجلين.">
        
        <div className="flex gap-3">
          <AdminButton
            icon={ExternalLink}
            variant="outline"
            onClick={() => window.open(`/courses/${course.id}`, '_blank')}>
            
            عرض في الموقع
          </AdminButton>
          <AdminButton
            icon={Edit}
            onClick={() => router.push(`/admin/courses/${course.id}/edit`)}>
            
            تعديل
          </AdminButton>
          <AdminButton
            icon={Trash2}
            variant="destructive"
            onClick={() => setDeleteDialog({ open: true, id: course.id })}>
            
            حذف
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AdminCard className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative h-48 w-full md:w-64 flex-shrink-0">
                {course.thumbnailUrl ?
                <img
                  src={course.thumbnailUrl}
                  alt={course.name}
                  className="h-full w-full rounded-2xl object-cover" /> :


                <div className="h-full w-full rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-primary" />
                  </div>
                }
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <Badge className={`rounded-full px-3 py-0.5 font-bold text-[10px] ${colors[level] || colors.MEDIUM}`}>
                    {labels[level] || level}
                  </Badge>
                  <Badge variant={course.isPublished ? "default" : "outline"} className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${course.isPublished ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-muted-foreground opacity-50 font-normal"}`}>
                    {course.isPublished ? "منشور" : "مسودة"}
                  </Badge>
                  <Badge variant={course.isActive ? "default" : "secondary"} className="rounded-full px-3 py-0.5 font-bold text-[10px]">
                    {course.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
                
                <h2 className="text-2xl font-black mb-2">{course.nameAr}</h2>
                <p className="text-muted-foreground mb-4">{course.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{course.instructorName || "غير محدد"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-black text-primary">{course.price} EGP</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{course.durationHours} ساعات</span>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="objectives">الأهداف</TabsTrigger>
              <TabsTrigger value="requirements">المتطلبات</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <AdminCard className="p-6">
                <h3 className="font-black text-lg mb-3">وصف الدورة</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {course.description || "لا يوجد وصف متاح لهذه الدورة."}
                </p>
              </AdminCard>
            </TabsContent>
            
            <TabsContent value="objectives" className="mt-4">
              <AdminCard className="p-6">
                <h3 className="font-black text-lg mb-3">أهداف التعلم</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  {(course.learningObjectives || "لا توجد أهداف محددة").split("\n").map((obj, idx) =>
                  obj.trim() && <li key={idx}>{obj}</li>
                  )}
                </ul>
              </AdminCard>
            </TabsContent>
            
            <TabsContent value="requirements" className="mt-4">
              <AdminCard className="p-6">
                <h3 className="font-black text-lg mb-3">المتطلبات</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  {(course.requirements || "لا توجد متطلبات محددة").split("\n").map((req, idx) =>
                  req.trim() && <li key={idx}>{req}</li>
                  )}
                </ul>
              </AdminCard>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <AdminCard className="p-6">
            <h3 className="font-black text-lg mb-4">إحصائيات الدورة</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">المسجلين</span>
                </div>
                <span className="font-bold">{course._count.enrollments}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">الوحدات</span>
                </div>
                <span className="font-bold">{course._count.topics}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">التقييم</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{course.rating?.toFixed(1) || "0.0"}</span>
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">التقييمات</span>
                </div>
                <span className="font-bold">{course._count.reviews}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">المدة</span>
                </div>
                <span className="font-bold">{course.durationHours} ساعة</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-bold mb-3">مستوى الصعوبة</h4>
              <div className="flex flex-col gap-2">
                {(['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const).map((lvl) =>
                <div key={lvl} className="flex items-center justify-between">
                    <span className={`text-sm ${lvl === level ? 'font-bold' : 'text-muted-foreground'}`}>
                      {labels[lvl]}
                    </span>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                      className={`h-full ${
                      lvl === level ?
                      lvl === 'EASY' ? 'bg-emerald-500' :
                      lvl === 'MEDIUM' ? 'bg-blue-500' :
                      lvl === 'HARD' ? 'bg-orange-500' : 'bg-rose-500' :
                      'bg-transparent'}`
                      }
                      style={{ width: lvl === level ? '100%' : '0%' }}>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>
          
          <AdminCard className="p-6">
            <h3 className="font-black text-lg mb-4">السعر</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{course.price}</span>
              <span className="text-muted-foreground">EGP</span>
            </div>
          </AdminCard>
          
          <AdminCard className="p-6">
            <h3 className="font-black text-lg mb-4">الإحصائيات المتقدمة</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">معدل الإكمال</span>
                  <span className="text-sm font-bold">65%</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">معدل الإعجاب</span>
                  <span className="text-sm font-bold">82%</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">متوسط الوقت</span>
                  <span className="text-sm font-bold">2.4h/week</span>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        title="حذف الدورة؟"
        description={`هل أنت متأكد أنك تريد حذف "${course.nameAr}"؟ لا يمكن التراجع عن هذا الإجراء.`} />
      
    </div>);

}