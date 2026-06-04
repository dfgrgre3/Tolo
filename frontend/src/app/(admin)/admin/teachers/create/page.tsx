"use client";

import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, BookOpen } from "lucide-react";
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

const createTeacherSchema = z.object({
  name: z.string().min(2, "اسم المعلم يجب أن يكون حرفين على الأقل"),
  subjectId: z.string().optional().or(z.literal("")),
  onlineUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CreateTeacherValues = z.infer<typeof createTeacherSchema>;

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

interface SubjectsResponse {
  data: {
    subjects: Subject[];
  };
}

export default function CreateTeacherPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);

  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await adminFetch(apiRoutes.admin.subjects);
        if (response.ok) {
          const data: SubjectsResponse = await response.json();
          setSubjects(data.data?.subjects || []);
        }
      } catch (error) {
        logger.error("Error fetching subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  const form = useForm<CreateTeacherValues>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      name: "",
      subjectId: "",
      onlineUrl: "",
      notes: "",
    },
  });

  const handleSubmit = async (values: CreateTeacherValues) => {
    setIsSubmitting(true);
    try {
      const response = await adminFetch(apiRoutes.admin.teachers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          subjectId: values.subjectId || undefined,
          onlineUrl: values.onlineUrl || undefined,
          notes: values.notes || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "تعذر إنشاء المعلم");
        return;
      }

      toast.success("تم إنشاء المعلم بنجاح");
      router.push("/admin/teachers");
    } catch (error) {
      logger.error("Error creating teacher:", error);
      toast.error("حدث خطأ أثناء إنشاء المعلم");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إضافة معلم جديد"
        description="إنشاء حساب معلم جديد وربطه بالمادة الدراسية."
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
            سيتم إنشاء حساب المعلم تلقائياً مع بريد إلكتروني وكلمة مرور عشوائية.
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
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المادة الدراسية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">بدون مادة</SelectItem>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.nameAr || subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <BookOpen className="h-4 w-4" />
                  ملاحظة
                </div>
                سيتم إنشاء حساب المعلم بريد إلكتروني تلقائي بصيغة: name@thanawy.local مع كلمة مرور عشوائية آمنة.
              </div>

              <div className="flex justify-end gap-3">
                <AdminButton type="button" variant="outline" onClick={() => router.push("/admin/teachers")}>
                  إلغاء
                </AdminButton>
                <AdminButton type="submit" icon={GraduationCap} loading={isSubmitting}>
                  إنشاء المعلم
                </AdminButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
