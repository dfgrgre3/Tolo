"use client";

import * as React from "react";
import { m, AnimatePresence } from "framer-motion";
import type { UseFormReturn } from "react-hook-form";
import {
  BookOpen,
  Clock,
  Crown,
  Eye,
  Globe,
  GraduationCap,
  PlayCircle,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CoursePreviewPanelProps {
  quickForm: UseFormReturn<any>;
}

const levelLabels: Record<string, string> = {
  BEGINNER: "مبتدئ",
  INTERMEDIATE: "متوسط",
  ADVANCED: "متقدم",
};

const levelColors: Record<string, string> = {
  BEGINNER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  INTERMEDIATE: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  ADVANCED: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

export function CoursePreviewPanel({ quickForm }: CoursePreviewPanelProps) {
  const values = quickForm.watch();
  const isFree = !values.price || values.price === 0;

  return (
    <div className="hidden lg:flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8 overflow-y-auto">
      {/* Preview Label */}
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-6"
      >
        <Eye className="h-4 w-4 text-primary" />
        <span className="text-xs font-black text-primary uppercase tracking-widest">
          معاينة حية
        </span>
        <m.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-emerald-500 mr-auto"
        />
      </m.div>

      {/* Card Preview */}
      <m.div
        layout
        className="relative rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden backdrop-blur-xl shadow-2xl shadow-primary/5"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-primary/20 via-violet-500/10 to-transparent">
          <AnimatePresence mode="wait">
            {values.thumbnailUrl ? (
              <m.img
                key={values.thumbnailUrl}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={values.thumbnailUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full w-full items-center justify-center"
              >
                <div className="text-center space-y-2">
                  <BookOpen className="h-10 w-10 text-white/20 mx-auto" />
                  <p className="text-[10px] text-white/30 font-bold">
                    صورة الغلاف
                  </p>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Featured */}
          <AnimatePresence>
            {values.isFeatured && (
              <m.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="absolute left-3 top-3"
              >
                <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 backdrop-blur-md">
                  <Crown className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400">مميزة</span>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Status */}
          <div className="absolute right-3 top-3 flex gap-1.5">
            <Badge
              className={cn(
                "rounded-lg border px-2 py-0.5 text-[10px] font-black backdrop-blur-md transition-colors",
                values.isPublished
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-orange-500/20 text-orange-300 border-orange-500/30",
              )}
            >
              {values.isPublished ? "منشورة" : "مسودة"}
            </Badge>
          </div>

          {/* Level */}
          <div className="absolute bottom-3 left-3">
            <Badge
              className={cn(
                "rounded-lg border px-2 py-0.5 text-[10px] font-black backdrop-blur-md transition-colors",
                levelColors[values.level || "INTERMEDIATE"],
              )}
            >
              {levelLabels[values.level || "INTERMEDIATE"]}
            </Badge>
          </div>

          {/* Price */}
          <div className="absolute bottom-3 right-3">
            <m.div
              key={String(isFree)}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn(
                "rounded-lg border px-2.5 py-0.5 text-[11px] font-black backdrop-blur-md transition-colors",
                isFree
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                  : "bg-black/60 text-white border-white/20",
              )}
            >
              {isFree ? "مجانية" : `${values.price} EGP`}
            </m.div>
          </div>

          {/* Play Button */}
          <AnimatePresence>
            {values.trailerUrl && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                  <PlayCircle className="h-8 w-8 text-white" />
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-base font-black leading-snug line-clamp-2">
              {values.nameAr || values.name || "اسم الدورة يظهر هنا..."}
            </h3>
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <GraduationCap className="h-3 w-3" />
              {values.instructorName || "اسم المحاضر"}
              {values.code && (
                <span className="text-primary/60 font-bold">
                  {" "}
                  • #{values.code}
                </span>
              )}
            </p>
          </div>

          <AnimatePresence>
            {values.description && (
              <m.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-white/40 leading-relaxed line-clamp-2"
              >
                {values.description}
              </m.p>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-2.5">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-black">0</span>
              </div>
              <p className="text-[9px] text-white/30">طالب</p>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-x border-white/10">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-violet-400" />
                <span className="text-xs font-black">0</span>
              </div>
              <p className="text-[9px] text-white/30">وحدة</p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-emerald-400" />
                <span className="text-xs font-black">{values.durationHours || 0}</span>
              </div>
              <p className="text-[9px] text-white/30">ساعة</p>
            </div>
          </div>
        </div>
      </m.div>

      {/* SEO Preview */}
      <AnimatePresence>
        {(values.seoTitle || values.seoDescription || values.slug) && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2"
          >
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-3.5 w-3.5 text-white/40" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">
                معاينة Google
              </span>
            </div>
            <div className="text-blue-400 text-sm font-medium hover:underline cursor-pointer line-clamp-1">
              {values.seoTitle || values.nameAr || "عنوان الدورة"}
            </div>
            <div className="text-emerald-500/70 text-[10px]">
              https://thanawy.com/courses/{values.slug || "course-url"}
            </div>
            <div className="text-white/30 text-xs line-clamp-2">
              {values.seoDescription || values.description || "وصف الدورة يظهر هنا..."}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Feature Flags */}
      <div className="mt-6 flex flex-wrap gap-2">
        <AnimatePresence>
          {values.isActive && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Badge className="rounded-lg bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold">
                نشطة
              </Badge>
            </m.div>
          )}
          {values.isPublished && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Badge className="rounded-lg bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                منشورة
              </Badge>
            </m.div>
          )}
          {values.isFeatured && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Badge className="rounded-lg bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-bold">
                مميزة
              </Badge>
            </m.div>
          )}
          {values.language && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Badge className="rounded-lg bg-white/5 text-white/50 border-white/10 text-[10px] font-bold">
                {values.language === "ar" ? "عربي" : "English"}
              </Badge>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
