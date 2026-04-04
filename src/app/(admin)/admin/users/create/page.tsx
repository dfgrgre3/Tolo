"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";import { logger } from '@/lib/logger';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createUserSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل").optional().or(z.literal("")),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN", "MODERATOR", "USER"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

const roleOptions = [
  { value: "STUDENT", label: "طالب" },
  { value: "TEACHER", label: "معلم" },
  { value: "MODERATOR", label: "مشرف" },
  { value: "ADMIN", label: "مدير" },
  { value: "USER", label: "مستخدم" },
] as const;

export default function CreateUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "STUDENT",
    },
  });

  const handleSubmit = async (values: CreateUserValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          username: values.username || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "تعذر إنشاء المستخدم");
        return;
      }

      toast.success("تم إنشاء المستخدم بنجاح");
      router.push(`/admin/users/${payload.data?.id ?? payload.id}`);
    } catch (error) {
      logger.error("Error creating user:", error);
      toast.error("حدث خطأ أثناء إنشاء المستخدم");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إضافة مستخدم جديد"
        description="إنشاء حساب جديد داخل لوحة التحكم مع تحديد الدور الأساسي من البداية."
      >
        <AdminButton variant="outline" onClick={() => router.push("/admin/users")}>
          رجوع إلى المستخدمين
        </AdminButton>
      </PageHeader>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            بيانات الحساب
          </CardTitle>
          <CardDescription>
            بعد الإنشاء يمكنك تعديل الصلاحيات والبيانات التفصيلية من صفحة المستخدم.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدور</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الدور" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Shield className="h-4 w-4" />
                  ملاحظة
                </div>
                إنشاء المستخدم هنا يفعّل البريد مباشرة ويمنح الصلاحيات الافتراضية المرتبطة بالدور المحدد.
              </div>

              <div className="flex justify-end gap-3">
                <AdminButton type="button" variant="outline" onClick={() => router.push("/admin/users")}>
                  إلغاء
                </AdminButton>
                <AdminButton type="submit" icon={UserPlus} loading={isSubmitting}>
                  إنشاء المستخدم
                </AdminButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
