"use client";

import { ChevronLeft, Layout, Sparkles } from "lucide-react";
import type { Control } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";

import type { CourseCategory, CourseFormValues } from "./types";

interface GeneralTabProps {
  control: Control<CourseFormValues>;
  categories: CourseCategory[];
  onNext: () => void;
  onGenerateWithAI: (field: "description" | "seoDescription") => void;
}

export function GeneralTab({
  control,
  categories,
  onNext,
  onGenerateWithAI,
}: GeneralTabProps) {
  return (
    <TabsContent value="general" className="mt-0 space-y-6">
      <AdminCard className="p-6">
        <div className="grid gap-6">
          <div className="flex items-center gap-3 pb-2 border-b">
            <Layout className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black">العناوين والهوية</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    اسم الدورة بالعربية
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="مثال: الرياضيات المتقدمة للصف الثالث الثانوي"
                      className="h-12 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    اسم الدورة بالإتجليزية
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Example: Advanced Mathematics"
                      className="h-12 rounded-xl"
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FormField
              control={control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    كود الدورة (اختياري)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="MATH-301"
                      className="h-12 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">التصنيف</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="اختر تصنيف" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    مستوى التعقيد
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BEGINNER">
                        مبتدئ / أساسي
                      </SelectItem>
                      <SelectItem value="INTERMEDIATE">
                        متوسط / عادي
                      </SelectItem>
                      <SelectItem value="ADVANCED">
                        متقدم / احترافي
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">لغة الدورة</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "ar"}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl">
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
              )}
            />
          </div>

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="font-bold">
                    وصف الدورة
                  </FormLabel>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg"
                    onClick={() => onGenerateWithAI("description")}
                  >
                    <Sparkles className="h-3 w-3" />
                    توليد بالذكاء الاصطناعي
                  </AdminButton>
                </div>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="أدخل وصفاً كبيراً ومفصلاً للدورة يوضح أهميتها وما سيتم تعلمه..."
                    className="min-h-[150px] rounded-2xl resize-none"
                  />
                </FormControl>
                <FormDescription className="text-[10px]">
                  هذا النص سيظهر في صفحة الدورة الرئيسية أسفل الفيديو التعريفي.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </AdminCard>

      <div className="flex justify-end gap-3">
        <AdminButton
          type="button"
          variant="outline"
          onClick={onNext}
          className="h-12 rounded-xl px-8 font-black gap-3"
        >
          التالي: التفاصيل والأسعار
          <ChevronLeft className="h-4 w-4" />
        </AdminButton>
      </div>
    </TabsContent>
  );
}
