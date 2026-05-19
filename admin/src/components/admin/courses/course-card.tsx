"use client";

import * as React from "react";
import type { Variants } from "framer-motion";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Clock,
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BookOpen,
  Crown,
  Lock,
  Unlock,
  Layers,
  Star,
} from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatPrice } from "@/lib/utils";
import {
  type CourseBase,
  type CourseActionCallbacks,
  levelConfig,
} from "./types";

interface CourseCardProps extends CourseActionCallbacks {
  course: CourseBase;
  index?: number;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export function CourseCard({
  course,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  index = 0,
}: CourseCardProps) {
  const learnersCount = course._count?.enrollments ?? 0;
  const topicsCount = course._count?.topics ?? 0;
  const level = (levelConfig[course.level] ?? levelConfig.INTERMEDIATE)!;
  const isFree = !course.price || course.price === 0;
  const canManage = Boolean(onEdit || onDuplicate || onDelete || onToggleStatus);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10",
        course.isFeatured && "ring-1 ring-amber-500/40",
        !course.isActive && "opacity-70",
      )}
    >
      {/* Featured Badge */}
      {course.isFeatured && (
        <div className="absolute left-3 top-3 z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 backdrop-blur-md"
          >
            <Crown className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-black text-amber-400">مميزة</span>
          </motion.div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.nameAr || course.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
            <BookOpen className="h-12 w-12 text-primary/30" />
          </div>
        )}

        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Status Badges */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <Badge
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg",
              course.isPublished
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-orange-500/20 text-orange-300 border-orange-500/30",
            )}
          >
            {course.isPublished ? "منشورة" : "مسودة"}
          </Badge>
          {!course.isActive && (
            <Badge className="rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-300 backdrop-blur-md">
              موقوفة
            </Badge>
          )}
        </div>

        {/* Level Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[10px] font-black backdrop-blur-md",
              level.color,
            )}
          >
            {level.label}
          </Badge>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <div
            className={cn(
              "rounded-lg border px-2.5 py-0.5 text-[11px] font-black backdrop-blur-md",
              isFree
                ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                : "bg-black/60 text-white border-white/20",
            )}
          >
            {isFree ? "مجانية" : formatPrice(course.price)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-sm font-black leading-snug transition-colors group-hover:text-primary">
              {course.nameAr || course.name}
            </h3>
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">
              {course.code && <span className="text-primary/60">#{course.code} • </span>}
              {course.instructorName || "بدون محاضر"}
            </p>
          </div>

          {/* Actions Menu */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AdminButton
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 shrink-0 rounded-full hover:bg-primary/10"
                >
                  <MoreVertical className="h-4 w-4" />
                </AdminButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/60">
                <DropdownMenuLabel className="text-xs font-black text-muted-foreground">
                  إجراءات الدورة
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(course)}
                    className="cursor-pointer gap-2.5 rounded-lg font-bold"
                  >
                    <Edit className="h-4 w-4 text-blue-500" />
                    تعديل البيانات
                  </DropdownMenuItem>
                )}
                <Link href={`/admin/courses/${course.id}/curriculum`} className="block">
                  <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg font-bold">
                    <Layers className="h-4 w-4 text-violet-500" />
                    إدارة المنهج
                  </DropdownMenuItem>
                </Link>
                {onDuplicate && (
                  <DropdownMenuItem
                    onClick={() => onDuplicate(course)}
                    className="cursor-pointer gap-2.5 rounded-lg font-bold"
                  >
                    <Copy className="h-4 w-4 text-amber-500" />
                    استنساخ الدورة
                  </DropdownMenuItem>
                )}
                <Link href={`/admin/courses/${course.id}/analytics`} className="block">
                  <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg font-bold">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    التحليلات
                  </DropdownMenuItem>
                </Link>
                {onToggleStatus && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onToggleStatus(course)}
                      className="cursor-pointer gap-2.5 rounded-lg font-bold"
                    >
                      {course.isPublished ? (
                        <>
                          <Lock className="h-4 w-4 text-orange-500" />
                          <span>إخفاء الدورة</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 text-emerald-500" />
                          <span>نشر الدورة</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(course)}
                      className="cursor-pointer gap-2.5 rounded-lg font-black text-red-500 focus:bg-red-500/10 focus:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف نهائي
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-black">{learnersCount}</span>
            </div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground/50">طالب</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 border-x border-border/30">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-violet-500" />
              <span className="text-xs font-black">{topicsCount}</span>
            </div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground/50">وحدة</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-black">{course.durationHours ?? 0}</span>
            </div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground/50">ساعة</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {onToggleStatus && (
            <AdminButton
              variant={course.isPublished ? "outline" : "default"}
              size="sm"
              className={cn(
                "h-9 flex-1 rounded-xl text-[11px] font-black",
                !course.isPublished && "shadow-md",
              )}
              onClick={() => onToggleStatus(course)}
            >
              {course.isPublished ? (
                <>
                  <XCircle className="ml-1 h-3.5 w-3.5" /> إخفاء
                </>
              ) : (
                <>
                  <CheckCircle2 className="ml-1 h-3.5 w-3.5" /> نشر
                </>
              )}
            </AdminButton>
          )}
          <Link href={`/admin/courses/${course.id}`} className={cn(onToggleStatus ? "flex-1" : "w-full")}>
            <AdminButton
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1 rounded-xl text-[11px] font-black"
            >
              <Eye className="h-3.5 w-3.5" />
              عرض
            </AdminButton>
          </Link>
          {onEdit && (
            <AdminButton
              variant="outline"
              size="icon-sm"
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={() => onEdit(course)}
            >
              <Edit className="h-3.5 w-3.5" />
            </AdminButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}
