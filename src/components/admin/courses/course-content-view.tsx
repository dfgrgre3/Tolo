"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { CourseCard } from "./course-card";
import { CourseListItem } from "./course-list-item";
import { CourseEmptyState } from "./course-empty-state";
import type { CourseBase } from "./types";

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function CourseGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-card/60 overflow-hidden animate-pulse"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="aspect-video bg-muted/50" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted/50 rounded-lg w-3/4" />
            <div className="h-3 bg-muted/50 rounded-lg w-1/2" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 bg-muted/50 rounded-xl" />
              <div className="h-8 bg-muted/50 rounded-xl" />
              <div className="h-8 bg-muted/50 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 bg-muted/50 rounded-xl" />
              <div className="h-9 flex-1 bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border bg-card/60 p-4 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-16 w-28 rounded-xl bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/50 rounded-lg w-1/3" />
            <div className="h-3 bg-muted/50 rounded-lg w-1/4" />
          </div>
          <div className="hidden md:flex gap-6">
            <div className="h-4 w-12 bg-muted/50 rounded-lg" />
            <div className="h-4 w-12 bg-muted/50 rounded-lg" />
            <div className="h-4 w-12 bg-muted/50 rounded-lg" />
          </div>
          <div className="h-5 w-16 bg-muted/50 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── CourseContentView ────────────────────────────────────────────────────────

interface CourseContentViewProps {
  view: "grid" | "list";
  isLoading: boolean;
  courses: CourseBase[];
  emptyState?: React.ReactNode;
  canManageCourses: boolean;
  handleDuplicate: (course: CourseBase) => void;
  handleToggleStatus: (course: CourseBase) => void;
  router: AppRouterInstance;
  setDeleteDialog: (dialog: { open: boolean; id: string | null }) => void;
  // Legacy props kept for backward compatibility
  columns?: unknown;
  pagination?: unknown;
  totalPages?: number;
  page?: number;
  limit?: number;
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
  setSelectedIds?: React.Dispatch<React.SetStateAction<string[]>>;
  handleBatchAction?: (action: "publish" | "unpublish" | "activate" | "deactivate" | "delete") => void;
  handleExport?: () => void;
  refetch?: () => void;
}

export function CourseContentView({
  view,
  isLoading,
  courses,
  emptyState,
  canManageCourses,
  handleDuplicate,
  handleToggleStatus,
  router,
  setDeleteDialog,
}: CourseContentViewProps) {
  // Grid view
  if (view === "grid") {
    if (isLoading) return <CourseGridSkeleton />;

    if (courses.length === 0) {
      return <>{emptyState || <CourseEmptyState />}</>;
    }

    return (
      <motion.div
        layout
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              onEdit={
                canManageCourses
                  ? (c) => router.push(`/admin/courses/${c.id}/edit`)
                  : undefined
              }
              onDuplicate={canManageCourses ? handleDuplicate : undefined}
              onDelete={
                canManageCourses
                  ? (c) => setDeleteDialog({ open: true, id: c.id })
                  : undefined
              }
              onToggleStatus={canManageCourses ? handleToggleStatus : undefined}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  // List view
  if (isLoading) return <CourseListSkeleton />;

  if (courses.length === 0) {
    return <>{emptyState || <CourseEmptyState />}</>;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {courses.map((course, index) => (
          <CourseListItem
            key={course.id}
            course={course}
            index={index}
            onEdit={
              canManageCourses
                ? (c) => router.push(`/admin/courses/${c.id}/edit`)
                : undefined
            }
            onDuplicate={canManageCourses ? handleDuplicate : undefined}
            onDelete={
              canManageCourses
                ? (c) => setDeleteDialog({ open: true, id: c.id })
                : undefined
            }
            onToggleStatus={canManageCourses ? handleToggleStatus : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
