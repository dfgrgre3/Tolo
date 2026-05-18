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
  TrendingUp,
  BookOpen,
  Crown,
  Lock,
  Unlock,
  Layers,
  GraduationCap,
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

interface CourseListItemProps extends CourseActionCallbacks {
  course: CourseBase;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  index?: number;
}

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
};

export function CourseListItem({
  course,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  isSelected,
  onSelect,
  index = 0,
}: CourseListItemProps) {
  const learnersCount = course._count?.enrollments ?? 0;
  const topicsCount = course._count?.topics ?? 0;
  const level = (levelConfig[course.level] ?? levelConfig.INTERMEDIATE)!;
  const isFree = !course.price || course.price === 0;
  const canManage = Boolean(onEdit || onDuplicate || onDelete || onToggleStatus);

  return (
    <motion.div
      custom={index}
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      layout
      className={cn(
        "group flex items-center gap-4 rounded-2xl border bg-card/60 p-4 backdrop-blur-sm",
        "transition-all duration-200 hover:shadow-lg hover:shadow-primary/5",
        isSelected && "ring-2 ring-primary/40 bg-primary/5",
        course.isFeatured && "ring-1 ring-amber-500/30",
        !course.isActive && "opacity-60",
      )}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <button
          onClick={() => onSelect(course.id)}
          className={cn(
            "h-5 w-5 shrink-0 rounded-md border-2 transition-all",
            isSelected
              ? "border-primary bg-primary"
              : "border-border/60 hover:border-primary/40",
          )}
          aria-label={isSelected ? "إلغاء تحديد الدورة" : "تحديد الدورة"}
        >
          {isSelected && (
            <CheckCircle2 className="h-full w-full p-0.5 text-white" />
          )}
        </button>
      )}

      {/* Thumbnail */}
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-border/40">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.nameAr || course.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            <BookOpen className="h-6 w-6 text-primary/30" />
          </div>
        )}
        {course.isFeatured && (
          <div className="absolute left-1 top-1">
            <Crown className="h-3 w-3 text-amber-400 drop-shadow" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-black transition-colors group-hover:text-primary">
            {course.nameAr || course.name}
          </h3>
          {course.code && (
            <span className="shrink-0 text-[10px] font-bold text-primary/50">
              #{course.code}
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <GraduationCap className="h-3 w-3" />
          {course.instructorName || "بدون محاضر"}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-6 md:flex">
        <div className="flex items-center gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-black">{learnersCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <BookOpen className="h-3.5 w-3.5 text-violet-500" />
          <span className="font-black">{topicsCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-black">{course.durationHours ?? 0}h</span>
        </div>
      </div>

      {/* Level */}
      <Badge
        className={cn(
          "hidden shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-black backdrop-blur-md sm:flex",
          level.color,
        )}
      >
        {level.label}
      </Badge>

      {/* Price */}
      <div
        className={cn(
          "hidden shrink-0 rounded-lg border px-2.5 py-0.5 text-[11px] font-black backdrop-blur-md lg:flex",
          isFree
            ? "border-teal-500/30 bg-teal-500/10 text-teal-500"
            : "border-border/40 bg-muted/40 text-foreground",
        )}
      >
        {isFree ? "مجانية" : formatPrice(course.price)}
      </div>

      {/* Status Badges */}
      <div className="hidden flex-col gap-1 xl:flex">
        <Badge
          variant="outline"
          className={cn(
            "h-5 rounded-md px-1.5 text-[9px] font-black",
            course.isPublished
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
              : "border-orange-500/20 bg-orange-500/10 text-orange-500",
          )}
        >
          {course.isPublished ? "منشورة" : "مسودة"}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link href={`/admin/courses/${course.id}`}>
          <AdminButton
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 rounded-lg hover:bg-primary/10"
          >
            <Eye className="h-3.5 w-3.5" />
          </AdminButton>
        </Link>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AdminButton
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 rounded-lg hover:bg-primary/10"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </AdminButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60">
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
    </motion.div>
  );
}
