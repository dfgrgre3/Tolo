"use client";

import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logger } from '@/lib/logger';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const editTeacherSchema = z.object({
  name: z.string().min(2, "اسم المعلم يجب أن يكون حرفين على الأقل"),
  onlineUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type EditTeacherValues = z.infer<typeof editTeacherSchema>;

interface Teacher {
  id: string;
  name: string;
  onlineUrl: string | null;
  notes: string | null;
  subjectId: string | null;
  rating: number;
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

interface TeacherResponse {
  data: {
    teacher: Teacher;
  };
}

interface SubjectsResponse {
  data: {
    subjects: Subject[];
  };
}

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params.id as string;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [teacher, setTeacher] = React.useState<Teacher | null>(null);

  const form = useForm<EditTeacherValues>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      name: "",
      onlineUrl: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [teacherRes, subjectsRes] = await Promise.all([
          adminFetch(`/api/admin/teachers?page=1&limit=100`),
          adminFetch(apiRoutes.admin.subjects),
        ]);

        if (subjectsRes.ok) {
          const subjectsData: SubjectsResponse = await subjectsRes.json();
          setSubjects(subjectsData.data?.subjects || []);
        }

        if (teacherRes.ok) {
          const teacherData: { data: { teachers: Teacher[] } } = await teacherRes.json();
          const found = teacherData.data?.teachers?.find((t: Teacher) => t.id === teacherId);
          if (found) {
            setTeacher(found);
            form.reset({
              name: found.name,
              onlineUrl: found.onlineUrl || "",
              notes: found.notes || "",
            });
          } else {
            toast.error("المعلم غير موجود");
            router.push("/admin/teachers");
          }
        }
      } catch (error) {
        logger.error("Error fetching teacher data:", error);
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [teacherId, form, router]);

  const handleSubmit = async (values: EditTeacherValues) => {
    setIsSubmitting(true);
    try {
      const response = await adminFetch(apiRoutes.admin.teachers, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: teacherId,
          name: values.name,
          onlineUrl: values.onlineUrl || undefined,
          notes: values.notes || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "تعذر تحديث المعلم");
        return;
      }

      toast.success("تم تحديث المعلم بنجاح");
      router.push("/admin/teachers");
    } catch (error) {
      logger.error("Error updating teacher:", error);
      toast.error("حدث خطأ أثناء تحديث المعلم");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات المعلم...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={`تعديل المعلم: ${teacher.name}`}
        description="تعديل بيانات المعلم ومعلوماته."
      >
        <AdminButton variant="outline" onClick={() => router.push("/admin/teachers")}>
          رجوع إلى المعلمين
        </AdminButton>
      </PageHeader>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5" />
            بيانات المعلم
          </CardTitle>
          <CardDescription>
            تعديل المعلومات الأساسية للمعلم.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المعلم</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم المعلم الكامل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onlineUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الحصة أونلاين (اختياري)</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://zoom.us/j/..." dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="أي ملاحظات خاصة بالمعلم..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-2xl border border-white/10 bg-accent/5 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">التقييم:</span>
                    <p className="font-bold">{teacher.rating || 0} / 5</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                    <p className="font-bold">{new Date(teacher.createdAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <AdminButton type="button" variant="outline" onClick={() => router.push("/admin/teachers")}>
                  إلغاء
                </AdminButton>
                <AdminButton type="submit" icon={GraduationCap} loading={isSubmitting}>
                  حفظ التغييرات
                </AdminButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
