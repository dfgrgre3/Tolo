"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Achievement, rarityOptions, categoryOptions, difficultyOptions } from "./types";

const achievementSchema = z.object({
  key: z.string().min(1, "المفتاح مطلوب"),
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  icon: z.string().min(1, "الأيقونة مطلوبة"),
  rarity: z.string().min(1, "الندرة مطلوبة"),
  xpReward: z.number().min(0, "المكافأة يجب أن تكون صفر أو أكثر"),
  isSecret: z.boolean(),
  category: z.string().min(1, "الفئة مطلوبة"),
  difficulty: z.string().min(1, "الصعوبة مطلوبة"),
});

type AchievementFormValues = z.infer<typeof achievementSchema>;

interface AchievementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAchievement: Achievement | null;
  onSuccess: () => void;
}

export function AchievementFormDialog({
  open,
  onOpenChange,
  editingAchievement,
  onSuccess,
}: AchievementFormDialogProps) {
  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      key: "",
      title: "",
      description: "",
      icon: "trophy",
      rarity: "common",
      xpReward: 10,
      isSecret: false,
      category: "STUDY",
      difficulty: "EASY",
    },
  });

  React.useEffect(() => {
    if (editingAchievement) {
      form.reset({
        key: editingAchievement.key,
        title: editingAchievement.title,
        description: editingAchievement.description,
        icon: editingAchievement.icon,
        rarity: editingAchievement.rarity,
        xpReward: editingAchievement.xpReward,
        isSecret: editingAchievement.isSecret,
        category: editingAchievement.category,
        difficulty: editingAchievement.difficulty,
      });
    } else {
      form.reset({
        key: "",
        title: "",
        description: "",
        icon: "trophy",
        rarity: "common",
        xpReward: 10,
        isSecret: false,
        category: "STUDY",
        difficulty: "EASY",
      });
    }
  }, [editingAchievement, form]);

  const handleSubmit = async (values: AchievementFormValues) => {
    try {
      const url = "/api/admin/achievements";
      const method = editingAchievement ? "PATCH" : "POST";
      const body = editingAchievement ? { ...values, id: editingAchievement.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingAchievement ? "تم تحديث الإنجاز بنجاح" : "تم إنشاء الإنجاز بنجاح");
        onSuccess();
      } else {
        toast.error("حدث خطأ أثناء حفظ الإنجاز");
      }
    } catch (error) {
      console.error("Error saving achievement:", error);
      toast.error("حدث خطأ أثناء حفظ الإنجاز");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingAchievement ? "تعديل الإنجاز" : "إضافة إنجاز جديد"}
          </DialogTitle>
          <DialogDescription>
            أدخل بيانات الإنجاز
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المفتاح *</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" placeholder="FIRST_STEPS" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الأيقونة *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="trophy" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف *</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rarity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الندرة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الندرة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rarityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="xpReward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مكافأة XP *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الفئة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الصعوبة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصعوبة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {difficultyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isSecret"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>إنجاز سري</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">
                {editingAchievement ? "تحديث" : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
