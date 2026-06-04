"use client";

import * as React from "react";
import { m } from "framer-motion";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { cn } from "@/lib/utils";

interface CourseEmptyStateProps {
  onAddCourse?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export function CourseEmptyState({
  onAddCourse,
  title = "لا توجد دورات مطابقة",
  description = "جرّب تغيير كلمة البحث أو الفلاتر، أو أنشئ دورة جديدة الآن.",
  className,
}: CourseEmptyStateProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "col-span-full flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-border/30 bg-gradient-to-b from-muted/10 to-muted/5 py-24 text-center",
        className,
      )}
    >
      {/* Animated Icon */}
      <div className="relative">
        <m.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-[2rem] bg-primary/10 blur-2xl"
        />
        <m.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative rounded-[2rem] bg-gradient-to-br from-primary/15 to-primary/5 p-6 ring-1 ring-primary/10"
        >
          <BookOpen className="h-12 w-12 text-primary/50" />
        </m.div>

        {/* Floating sparkles */}
        <m.div
          animate={{ y: [-4, 4, -4], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-3 -top-2"
        >
          <Sparkles className="h-4 w-4 text-primary/30" />
        </m.div>
        <m.div
          animate={{ y: [4, -4, 4], rotate: [0, -10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -left-2 top-1/2"
        >
          <Sparkles className="h-3 w-3 text-primary/20" />
        </m.div>
      </div>

      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <p className="text-lg font-black text-foreground">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </m.div>

      {onAddCourse && (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        >
          <AdminButton
            onClick={onAddCourse}
            className="mt-2 h-12 gap-2.5 rounded-2xl px-8 font-black shadow-xl shadow-primary/20"
          >
            <Plus className="h-5 w-5" />
            إنشاء دورة جديدة
          </AdminButton>
        </m.div>
      )}
    </m.div>
  );
}
