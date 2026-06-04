"use client";

import {
  ChevronRight,
  Globe,
  Rocket,
  Search,
  Trophy,
} from "lucide-react";
import type { Control, UseFormWatch } from "react-hook-form";

import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";

import type { CourseFormValues } from "./types";
import { SubmitIcon } from "./shared-components";

interface SeoTabProps {
  control: Control<CourseFormValues>;
  watch: UseFormWatch<CourseFormValues>;
  isSubmitting: boolean;
  onPrev: () => void;
}

export function SeoTab({
  control,
  watch,
  isSubmitting,
  onPrev,
}: SeoTabProps) {
  return (
    <TabsContent value="seo" className="mt-0 space-y-6">
      <AdminCard className="p-6">
        <div className="grid gap-6">
          <div className="flex items-center gap-3 pb-2 border-b">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black">
              تهيئة محركات البحث والتسويق
            </h3>
          </div>

          <FormField
            control={control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">
                  رابط الصفحة (Slug)
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="mathematics-grade-3"
                      className="h-12 rounded-xl pl-32"
                      dir="ltr"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                      /courses/
                    </div>
                  </div>
                </FormControl>
                <FormDescription className="text-[10px]">
                  اترك الحقل فارغاً سيتم إنتاجه من الاسم تلقائياً.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    عنوان الصفحة (Meta Title)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      className="h-12 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="seoDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    وصف محركات البحث (Meta Description)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      className="min-h-[80px] rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
            <h4 className="text-xs font-bold mb-3 text-muted-foreground flex items-center gap-2">
              <Search className="h-3 w-3" />
              معاينة نتائج جوجل
            </h4>
            <div className="space-y-1">
              <div className="text-blue-500 text-lg font-medium hover:underline cursor-pointer">
                {watch("seoTitle") ||
                  watch("nameAr") ||
                  "عنوان الدورة يظهر هنا"}
              </div>
              <div className="text-emerald-700 text-xs">
                https://thanawy.com/courses/
                {watch("slug") || "course-url"}
              </div>
              <div className="text-muted-foreground text-sm line-clamp-2">
                {watch("seoDescription") ||
                  watch("description") ||
                  "وصف الدورة يظهر هنا في نتائج البحث لجذب الطلاب للنقر والدخول..."}
              </div>
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="p-6 bg-slate-900 border-primary/20">
        <div className="flex items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute -right-10 -bottom-10 h-64 w-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <Rocket className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-black text-white">
                حالة النشر والظهور
              </h3>
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              عند تفعيل النشر، ستظهر الدورة لجميع الطلاب في المتجر التعليمي. تأكد من أن جميع الوحدات التعليمية جاهزة.
            </p>

            <div className="flex items-center gap-8">
              <FormField
                control={control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </FormControl>
                    <FormLabel className="text-white font-bold cursor-pointer">
                      نشر الدورة فوراً
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </FormControl>
                    <FormLabel className="text-white font-bold cursor-pointer">
                      تمييز الدورة
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                    <FormLabel className="text-white font-bold cursor-pointer">
                      تفعيل الدورة (Active)
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="hidden md:block relative z-10">
            <div className="h-32 w-32 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-3xl shadow-2xl rotate-12">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>
      </AdminCard>

      <div className="flex justify-between">
        <AdminButton
          type="button"
          variant="outline"
          onClick={onPrev}
          className="h-12 rounded-xl px-8 font-black gap-3"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </AdminButton>
        <AdminButton
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-xl px-12 font-black gap-3 text-lg"
        >
          <SubmitIcon isSubmitting={isSubmitting} size="5" />
          إكمال وحفظ الدورة
        </AdminButton>
      </div>
    </TabsContent>
  );
}
