"use client";

import React from "react";
import Image from "next/image";
import { MoreVertical, Users, BookOpen, Star, Edit, Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Course } from "../hooks/use-teaching-data";

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDuplicate: (course: Course) => void;
  onDelete: (id: string) => void;
}

export default function CourseCard({
  course,
  onEdit,
  onDuplicate,
  onDelete,
}: CourseCardProps) {
  const getStatusBadge = (status: Course["status"]) => {
    switch (status) {
      case "published":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-2.5 py-0.5">منشور</Badge>;
      case "draft":
        return <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-full px-2.5 py-0.5">مسودة</Badge>;
      case "archived":
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white rounded-full px-2.5 py-0.5">مؤرشف</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden bg-card text-right flex flex-col h-full group">
      {/* Thumbnail Banner */}
      <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        <Image
          src={course.thumbnail}
          alt={course.title}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">{getStatusBadge(course.status)}</div>
        <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">
          ${course.price}
        </div>
      </div>

      {/* Info Content */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-primary/80 block">
            {course.category}
          </span>
          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 line-clamp-2 leading-relaxed">
            {course.title}
          </h4>
        </div>

        {/* Stats and Action Dropdown */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-450">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{course.studentsCount} طالب</span>
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{course.lessonsCount} درس</span>
            </span>
            {course.rating > 0 && (
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>{course.rating}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(course)}
              className="w-7.5 h-7.5 rounded-lg border-slate-200 dark:border-slate-800"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7.5 h-7.5 rounded-lg"
                >
                  <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 dark:border-slate-800 text-right">
                <DropdownMenuItem onClick={() => onDuplicate(course)} className="px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>تكرار الكورس</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(course.id)} className="px-3 py-1.5 text-xs text-red-500 flex items-center gap-2 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الكورس</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
