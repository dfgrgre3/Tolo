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
import { AdminButton } from "@/components/admin/ui/admin-button";
import { useForm } from "react-hook-form";
import { Hammer, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Achievement, rarityOptions, categoryOptions, difficultyOptions } from "./types";
import { logger } from '@/lib/logger';

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
      logger.error("Error saving achievement:", error);
      toast.error("حدث خطأ أثناء حفظ الإنجاز");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500" />
        <div className="p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black">
              {editingAchievement ? "تنقيح وسام الجدارة" : "صياغة وسام ملكي جديد"}
            </DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground">
              أدخل بيانات الوسام بدقة لتكريم المحاربين المستحقين.
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
                  <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مفتاح الاستدعاء (Key)</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" placeholder="FIRST_STEPS" className="rounded-xl border-white/10 bg-white/5 h-11" />
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
                  <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">أيقونة الوسام</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="trophy" className="rounded-xl border-white/10 bg-white/5 h-11" />
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
                  <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مانشيت الوسام (العنوان)</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" />
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
                  <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">وصف البطولة (المحتوى)</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="rounded-2xl border-white/10 bg-white/5 p-4 font-medium" />
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
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مستوى الندرة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11">
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
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مكافأة الـ XP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="rounded-xl border-white/10 bg-white/5 h-11 text-center font-black"
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
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مجال التميز (الفئة)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11">
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
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">صعوبة المنال</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11">
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
                <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="space-y-0.5">
                    <FormLabel className="font-black text-xs">وسام سري؟</FormLabel>
                    <p className="text-[10px] text-muted-foreground font-bold">يظهر للمحاربين كعلامة استفهام؟</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <AdminButton type="submit" icon={editingAchievement ? Sparkles : Hammer} className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                {editingAchievement ? "تحديث ميزات الوسام" : "صب الوسام في القالب"}
              </AdminButton>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
