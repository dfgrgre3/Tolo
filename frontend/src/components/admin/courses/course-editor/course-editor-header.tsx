"use client";

import { ChevronRight } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { StatusBadge, SubmitIcon } from "./shared-components";

interface CourseEditorHeaderProps {
  courseId?: string;
  nameAr?: string;
  isPublished: boolean;
  isSubmitting: boolean;
  onBack: () => void;
}

export function CourseEditorHeader({
  courseId,
  nameAr,
  isPublished,
  isSubmitting,
  onBack,
}: CourseEditorHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 border-b border-border/50 px-1">
      <div className="flex items-center gap-4">
        <AdminButton
          variant="outline"
          size="icon"
          type="button"
          onClick={onBack}
          className="rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </AdminButton>
        <div>
          <h1 className="text-xl font-black">
            {courseId ? "تعديل الدورة التعليمية" : "إنشاء دورة تعليمية جديدة"}
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            {nameAr || "دورة غير معنونة"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <StatusBadge isPublished={isPublished} />
        <AdminButton
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-xl px-6 font-black gap-2 min-w-[120px]"
        >
          <SubmitIcon isSubmitting={isSubmitting} />
          حفظ الدورة
        </AdminButton>
      </div>
    </div>
  );
}
