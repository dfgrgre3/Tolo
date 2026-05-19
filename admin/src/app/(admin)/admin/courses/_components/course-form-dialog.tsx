"use client";

import * as React from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import { CoursePreviewPanel } from "@/components/admin/courses/course-preview-panel";
import type { Course, CourseCategory } from "./types";

const quickCourseSchema = z.object({
  name: z.string().min(1, "اسم الدورة بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "اسم الدورة بالعربية مطلوب"),
  code: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "السعر يجب أن يكون صفرًا أو أكثر"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  isPublished: z.boolean(),
  durationHours: z.coerce.number().min(0),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  coursePrerequisites: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  whatYouLearn: z.string().optional().nullable()
});

export type QuickCourseValues = z.infer<typeof quickCourseSchema>;
export { quickCourseSchema };

export const quickCourseDefaults: QuickCourseValues = {
  name: "",
  nameAr: "",
  code: "",
  price: 0,
  level: "INTERMEDIATE",
  instructorName: "",
  instructorId: "",
  categoryId: "",
  description: "",
  isActive: true,
  isPublished: false,
  durationHours: 0,
  requirements: "",
  learningObjectives: "",
  thumbnailUrl: "",
  trailerUrl: "",
  slug: "",
  seoTitle: "",
  seoDescription: "",
  language: "ar",
  isFeatured: false,
  coursePrerequisites: "",
  targetAudience: "",
  whatYouLearn: ""
};

export interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCourse: Course | null;
  isSubmitting: boolean;
  teachers: Array<{ id: string; name: string }>;
  categories: CourseCategory[];
  quickForm: UseFormReturn<QuickCourseValues>;
  onSubmit: (values: QuickCourseValues) => Promise<void>;
  onFullEditor: (courseId: string) => void;
}

export function CourseFormDialog({
  open,
  onOpenChange,
  editingCourse,
  isSubmitting,
  teachers,
  categories,
  quickForm,
  onSubmit,
  onFullEditor,
}: CourseFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-5xl rounded-[2rem] p-0">
        <div className="grid max-h-[88vh] gap-0 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-y-auto p-6 sm:p-8" dir="rtl">
            <DialogHeader className="space-y-2 text-right">
              <DialogTitle className="text-2xl font-black">
                {editingCourse ? "تعديل بيانات الدورة" : "إنشاء دورة سريع"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editingCourse ?
                  "عدّل البيانات الأساسية – للتحكم الكامل توجّه لصفحة المحرر." :
                  "أدخل البيانات الأساسية ثم أضف المنهج الدراسي والوسائط من صفحة الدورة."}
              </p>
              {!editingCourse &&
                <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-bold text-primary">
                    بعد الإنشاء ستُوجِّه تلقائيًا لصفحة إضافة الفصول والدروس.
                  </p>
                </div>
              }
            </DialogHeader>

            <Form {...quickForm}>
              <form
                onSubmit={quickForm.handleSubmit(onSubmit)}
                className="mt-6 space-y-5">

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={quickForm.control}
                    name="nameAr"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">اسم الدورة بالعربية *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="مثال: أساسيات الرياضيات"
                            className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="name"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">Course Name (EN) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Math Fundamentals"
                            dir="ltr"
                            className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={quickForm.control}
                    name="code"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">كود الدورة</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="MATH-2026"
                            className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="slug"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">الرابط المختصر</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="math-fundamentals"
                            dir="ltr"
                            className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                </div>

                <FormField
                  control={quickForm.control}
                  name="description"
                  render={({ field }) =>
                    <FormItem>
                      <FormLabel className="font-bold">الوصف</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="ملخص واضح لما سيتعلمه الطالب داخل الدورة..."
                          className="min-h-[90px] rounded-xl resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField
                    control={quickForm.control}
                    name="price"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">السعر (ج)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="durationHours"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">الساعات</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="level"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">المستوى</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BEGINNER">مبتدئ</SelectItem>
                            <SelectItem value="INTERMEDIATE">متوسط</SelectItem>
                            <SelectItem value="ADVANCED">متقدم</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="language"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">اللغة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "ar"}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    } />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={quickForm.control}
                    name="instructorId"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">المدرس</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="اختر مدرسًا" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teachers.map((t) =>
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="categoryId"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">التصنيف</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="اختر تصنيفًا" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) =>
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    } />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={quickForm.control}
                    name="thumbnailUrl"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">صورة الغلاف</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="رابط مباشر للصورة"
                              className="h-11 rounded-xl" />
                            <AdminUpload
                              accept="image/*"
                              label="رفع صورة"
                              onUploadComplete={(url) => field.onChange(url)} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                  <FormField
                    control={quickForm.control}
                    name="trailerUrl"
                    render={({ field }) =>
                      <FormItem>
                        <FormLabel className="font-bold">فيديو تعريفي</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="رابط يوتيوب أو فيديو مباشر"
                              className="h-11 rounded-xl" />
                            <AdminUpload
                              accept="video/*"
                              label="رفع فيديو"
                              maxSize={5 * 1024}
                              onUploadComplete={(url) => field.onChange(url)} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(["isActive", "isPublished", "isFeatured"] as const).map((name) => {
                    const labels = {
                      isActive: { title: "تفعيل الدورة", desc: "تظهر في النظام" },
                      isPublished: { title: "نشر للطلاب", desc: "مرئية للجمهور" },
                      isFeatured: { title: "دورة مميزة", desc: "تمييز خاص" }
                    };
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3.5">
                        <div>
                          <p className="text-sm font-black">{labels[name].title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {labels[name].desc}
                          </p>
                        </div>
                        <FormField
                          control={quickForm.control}
                          name={name}
                          render={({ field }) =>
                            <FormControl>
                              <Switch
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange} />
                            </FormControl>
                          } />
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="gap-2 pt-2">
                  {editingCourse &&
                    <AdminButton
                      type="button"
                      variant="outline"
                      onClick={() => onFullEditor(editingCourse.id)}
                      className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      فتح المحرر الكامل
                    </AdminButton>
                  }
                  <AdminButton
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 text-base font-black gap-2">
                    {isSubmitting ?
                      <Loader2 className="h-4 w-4 animate-spin" /> :
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    {editingCourse ? "حفظ التعديلات" : "إنشاء الدورة"}
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>

          <CoursePreviewPanel quickForm={quickForm} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
