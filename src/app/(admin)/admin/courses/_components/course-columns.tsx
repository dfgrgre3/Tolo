"use client";

import * as React from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BookOpen,
  Clock,
  DollarSign,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  PlayCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/admin/ui/admin-table";
import { cn } from "@/lib/utils";
import type { Course } from "./types";

const levelLabels: Record<string, string> = {
  BEGINNER: "مبتدئ",
  INTERMEDIATE: "متوسط",
  ADVANCED: "متقدم"
};

const levelStyles: Record<string, string> = {
  BEGINNER: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  INTERMEDIATE: "border-sky-500/20 bg-sky-500/10 text-sky-600",
  ADVANCED: "border-violet-500/20 bg-violet-500/10 text-violet-600"
};

export interface CreateCourseColumnsParams {
  router: AppRouterInstance;
  canManageCourses: boolean;
  setDeleteDialog: React.Dispatch<React.SetStateAction<{ open: boolean; id: string | null }>>;
}

export function createCourseColumns(params: CreateCourseColumnsParams): ColumnDef<Course>[] {
  const { router, canManageCourses, setDeleteDialog } = params;

  return [
    {
      accessorKey: "name",
      id: "nameAr",
      header: "الدورة",
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
              {course.thumbnailUrl ?
                <Image
                  src={course.thumbnailUrl}
                  alt={course.name}
                  fill
                  className="object-cover" /> :
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <PlayCircle className="h-6 w-6 text-primary/40" />
                </div>
              }
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-black">{course.nameAr || course.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <GraduationCap className="h-3 w-3 shrink-0" />
                <span className="truncate">{course.instructorName || "بدون مدرس"}</span>
                {course.code &&
                  <span className="text-primary/60 font-bold">#{course.code}</span>
                }
              </div>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "price",
      header: "السعر",
      cell: ({ row }) =>
        <div className="flex items-center gap-1 text-sm font-black">
          {row.original.price === 0 ?
            <span className="text-teal-500">مجانية</span> :
            <>
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">{row.original.price} ج</span>
            </>
          }
        </div>
    },
    {
      accessorKey: "durationHours",
      header: "المدة",
      cell: ({ row }) =>
        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {row.original.durationHours || 0}h
        </div>
    },
    {
      id: "enrollments",
      header: "الطلاب",
      cell: ({ row }) =>
        <div className="flex items-center gap-1 text-sm font-bold">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          {row.original._count?.enrollments || 0}
        </div>
    },
    {
      id: "topics",
      header: "الوحدات",
      cell: ({ row }) =>
        <div className="flex items-center gap-1 text-sm font-bold">
          <LayoutGrid className="h-3.5 w-3.5 text-violet-500" />
          {row.original._count?.topics || 0}
        </div>
    },
    {
      accessorKey: "level",
      header: "المستوى",
      cell: ({ row }) => {
        const level = (row.original.level || "INTERMEDIATE") as string;
        return (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              levelStyles[level] || levelStyles.INTERMEDIATE
            )}>
            {levelLabels[level] || level}
          </Badge>
        );
      }
    },
    {
      accessorKey: "isPublished",
      header: "النشر",
      cell: ({ row }) =>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            row.original.isPublished ?
              "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" :
              "border-border/60 bg-muted/30 text-muted-foreground"
          )}>
          {row.original.isPublished ? "منشورة" : "مسودة"}
        </Badge>
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) =>
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
          {row.original.isActive ? "نشطة" : "موقوفة"}
        </Badge>
    },
    {
      id: "actions",
      header: "إجراءات",
      cell: ({ row }) =>
        <RowActions
          row={row.original}
          onView={(course) => router.push(`/admin/courses/${course.id}`)}
          onEdit={canManageCourses ? (course) => router.push(`/admin/courses/${course.id}`) : undefined}
          onDelete={canManageCourses ? (course) => setDeleteDialog({ open: true, id: course.id }) : undefined}
          extraActions={[
            {
              icon: BookOpen,
              label: "إدارة المنهج",
              onClick: (course) => router.push(`/admin/courses/${course.id}/curriculum`)
            },
            {
              icon: TrendingUp,
              label: "التحليلات",
              onClick: (course) => router.push(`/admin/courses/${course.id}/analytics`)
            },
            {
              icon: ExternalLink,
              label: "عرض في الموقع",
              onClick: (course) => router.push(`/courses/${course.id}`)
            }
          ]}
        />
    }
  ];
}
