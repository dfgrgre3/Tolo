"use client";

import * as React from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  Pencil,
  Plus,
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
import { AdminButton } from "@/components/admin/ui/admin-button";
import type { CourseCategory } from "./types";

const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب"),
  slug: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  description: z.string().optional().nullable()
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export { categorySchema };

export const defaultCategoryValues: CategoryFormValues = {
  name: "",
  slug: "",
  icon: "",
  description: ""
};

export interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: CourseCategory | null;
  categoryForm: UseFormReturn<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onDeleteRequest: (category: CourseCategory) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  editingCategory,
  categoryForm,
  onSubmit,
  onDeleteRequest,
}: CategoryDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl rounded-[2rem] p-0">
        <div className="p-6 sm:p-8" dir="rtl">
          <DialogHeader className="space-y-2 text-right">
            <DialogTitle className="text-2xl font-black">
              {editingCategory ? "تعديل تصنيف" : "إضافة تصنيف جديد"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              استخدم التصنيفات لتنظيم دوراتك في مجموعات منطقية.
            </p>
          </DialogHeader>

          <Form {...categoryForm}>
            <form
              onSubmit={categoryForm.handleSubmit(onSubmit)}
              className="mt-6 space-y-5">

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={categoryForm.control}
                  name="name"
                  render={({ field }) =>
                    <FormItem>
                      <FormLabel className="font-bold">اسم التصنيف *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="مثال: الرياضيات"
                          className="h-11 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />

                <FormField
                  control={categoryForm.control}
                  name="slug"
                  render={({ field }) =>
                    <FormItem>
                      <FormLabel className="font-bold">الرابط المختصر</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="mathematics"
                          dir="ltr"
                          className="h-11 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={categoryForm.control}
                  name="icon"
                  render={({ field }) =>
                    <FormItem>
                      <FormLabel className="font-bold">الأيقونة (اسم Lucide)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="BookOpen"
                          className="h-11 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-black text-muted-foreground">الدورات المرتبطة</p>
                  <p className="mt-2 text-3xl font-black">{editingCategory?.coursesCount ?? 0}</p>
                </div>
              </div>

              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) =>
                  <FormItem>
                    <FormLabel className="font-bold">الوصف</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        className="min-h-[100px] rounded-xl"
                        placeholder="وصف مختصر لهذا التصنيف..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                } />

              <DialogFooter className="gap-2 sm:justify-between">
                {editingCategory &&
                  <AdminButton
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      onDeleteRequest(editingCategory);
                    }}>
                    حذف هذا التصنيف
                  </AdminButton>
                }
                <div className="flex gap-2">
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                    }}>
                    إلغاء
                  </AdminButton>
                  <AdminButton type="submit" icon={editingCategory ? Pencil : Plus}>
                    {editingCategory ? "حفظ التعديلات" : "إنشاء التصنيف"}
                  </AdminButton>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
