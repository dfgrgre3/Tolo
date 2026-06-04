"use client";

import * as React from "react";
import { m } from "framer-motion";
import {
  ExternalLink,
  FileText,
  Globe,
  LayoutGrid,
  Layers,
  Sparkles,
  Video,
  CheckCircle2,
  Circle,
} from "lucide-react";

import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { TabValue } from "./types";
import { HealthCheckItem } from "./shared-components";

// ─── Tab Config ──────────────────────────────────────────────────────────────

interface TabConfig {
  value: TabValue;
  label: string;
  icon: React.ElementType;
}

const tabs: TabConfig[] = [
  { value: "general", label: "المعلومات الأساسية", icon: LayoutGrid },
  { value: "details", label: "التفاصيل والأسعار", icon: FileText },
  { value: "media", label: "الوسائط والمعاينة", icon: Video },
  { value: "seo", label: "محركات البحث SEO", icon: Globe },
];

// ─── CourseHealthCard ────────────────────────────────────────────────────────
/** Course health validation card */
const CourseHealthCard = ({
  thumbnailUrl,
  trailerUrl,
  description,
}: {
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  description?: string | null;
}) => {
  const checks = [
    { label: "صورة الغلاف", isValid: !!thumbnailUrl },
    { label: "فيديو المقدمة", isValid: !!trailerUrl },
    { label: "الوصف التفصيلي", isValid: !!description && description.length > 50, invalidText: "قصير جداً" },
  ];

  const completedCount = checks.filter((c) => c.isValid).length;
  const progressPercent = Math.round((completedCount / checks.length) * 100);

  return (
    <AdminCard className="p-4 mt-6 bg-primary/5 border-dashed border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-bold">صحة الدورة</h4>
        <span className="mr-auto text-[10px] font-black text-primary/70">
          {progressPercent}٪
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-border/30 overflow-hidden mb-3">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={
            progressPercent === 100
              ? "h-full rounded-full bg-emerald-500"
              : "h-full rounded-full bg-primary"
          }
        />
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <HealthCheckItem
            key={check.label}
            label={check.label}
            isValid={check.isValid}
            invalidText={check.invalidText}
          />
        ))}
      </div>
    </AdminCard>
  );
};

// ─── CurriculumLinkCard ──────────────────────────────────────────────────────
/** Curriculum stats + link card */
const CurriculumLinkCard = ({
  courseId,
  isCurriculumLoading,
  chaptersCount,
  lessonsCount,
  onNavigate,
}: {
  courseId: string;
  isCurriculumLoading: boolean;
  chaptersCount: number;
  lessonsCount: number;
  onNavigate: (path: string) => void;
}) => (
  <AdminCard className="p-4 bg-slate-950 border-primary/20 text-white">
    <div className="mb-3 flex items-center gap-2">
      <Layers className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-bold">ربط الدورة بالمحتوى</h4>
    </div>
    <div className="mb-4 grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[10px] text-slate-400">الفصول</p>
        <m.p
          key={chaptersCount}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mt-1 text-xl font-black"
        >
          {isCurriculumLoading ? "..." : chaptersCount}
        </m.p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[10px] text-slate-400">الدروس</p>
        <m.p
          key={lessonsCount}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mt-1 text-xl font-black"
        >
          {isCurriculumLoading ? "..." : lessonsCount}
        </m.p>
      </div>
    </div>
    <p className="text-xs leading-6 text-slate-300">
      اربط بيانات الدورة بالمحتوى التعليمي من خلال صفحة المنهج حتى تظهر الفصول والدروس بشكل صحيح للطلاب داخل صفحة الدورة والتعلم.
    </p>
    <div className="mt-4 flex flex-col gap-2">
      <AdminButton
        type="button"
        className="w-full justify-between"
        onClick={() => onNavigate(`/admin/courses/${courseId}/curriculum`)}
      >
        إدارة المنهج الدراسي
        <Layers className="h-4 w-4" />
      </AdminButton>
      <AdminButton
        type="button"
        variant="outline"
        className="w-full justify-between border-white/15 bg-transparent text-white hover:bg-white/10"
        onClick={() => onNavigate(`/admin/courses/${courseId}`)}
      >
        صفحة تفاصيل الدورة
        <ExternalLink className="h-4 w-4" />
      </AdminButton>
    </div>
  </AdminCard>
);

// ─── CourseEditorSidebar ─────────────────────────────────────────────────────
interface CourseEditorSidebarProps {
  courseId?: string;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  description?: string | null;
  isCurriculumLoading: boolean;
  chaptersCount: number;
  lessonsCount: number;
  onNavigate: (path: string) => void;
  /** Used to show completion indicators per tab */
  completedTabs?: TabValue[];
}

export function CourseEditorSidebar({
  courseId,
  thumbnailUrl,
  trailerUrl,
  description,
  isCurriculumLoading,
  chaptersCount,
  lessonsCount,
  onNavigate,
  completedTabs = [],
}: CourseEditorSidebarProps) {
  return (
    <aside className="lg:w-64 space-y-2">
      <TabsList className="flex flex-row lg:flex-col h-auto w-full bg-transparent gap-1 p-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isCompleted = completedTabs.includes(tab.value);

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="w-full justify-start gap-3 rounded-xl py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative"
            >
              <Icon className="h-4 w-4" />
              <span className="font-bold flex-1 text-right">{tab.label}</span>
              {isCompleted && (
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </m.div>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <CourseHealthCard
        thumbnailUrl={thumbnailUrl}
        trailerUrl={trailerUrl}
        description={description}
      />

      {courseId ? (
        <CurriculumLinkCard
          courseId={courseId}
          isCurriculumLoading={isCurriculumLoading}
          chaptersCount={chaptersCount}
          lessonsCount={lessonsCount}
          onNavigate={onNavigate}
        />
      ) : null}
    </aside>
  );
}
