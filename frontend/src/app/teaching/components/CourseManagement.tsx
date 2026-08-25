"use client";

import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CourseCard from "./CourseCard";
import EmptyState from "./EmptyState";
import { Course } from "../hooks/use-teaching-data";

interface CourseManagementProps {
  courses: Course[];
  onCreateCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDuplicateCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
}

type FilterStatus = "all" | "published" | "draft" | "archived";

export default function CourseManagement({
  courses,
  onCreateCourse,
  onEditCourse,
  onDuplicateCourse,
  onDeleteCourse,
}: CourseManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">مستودع الكورسات</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">أنشئ الكورسات والدروس، وقم بتعديل أو أرشفة المحتوى الحالي</p>
        </div>
        <Button onClick={onCreateCourse} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 rounded-xl">
          <Plus className="w-4 h-4" />
          إنشاء كورس جديد
        </Button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم الكورس..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-right pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          {(["all", "published", "draft", "archived"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === status
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40"
              }`}
            >
              {status === "all" && "الكل"}
              {status === "published" && "منشورة"}
              {status === "draft" && "مسودات"}
              {status === "archived" && "مؤرشفة"}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid view */}
      {filteredCourses.length === 0 ? (
        <EmptyState
          title="لا يوجد كورسات مطابقة"
          description="لم نجد أي كورسات بناءً على بحثك أو حالة التصفية المحددة. جرب كلمة بحث أخرى أو قم بإنشاء كورس جديد."
          actionText="أنشئ كورسك الأول الآن"
          onAction={onCreateCourse}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEdit={onEditCourse}
              onDuplicate={onDuplicateCourse}
              onDelete={onDeleteCourse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
