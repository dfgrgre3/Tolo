"use client";

import * as React from "react";
import { 
  Users, 
  Clock, 
  BarChart, 
  Settings, 
  MoreVertical, 
  Edit, 
  Eye, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Star
} from "lucide-react";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn, formatPrice } from "@/lib/utils";
import Link from "next/link";

interface CourseCardProps {
  course: any;
  onEdit: (course: any) => void;
  onDuplicate: (course: any) => void;
  onDelete: (course: any) => void;
  onToggleStatus: (course: any) => void;
}

export function CourseCard({ course, onEdit, onDuplicate, onDelete, onToggleStatus }: CourseCardProps) {
  return (
    <AdminCard className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-primary/10">
      {/* Premium Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-muted">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.nameAr || course.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BarChart className="h-12 w-12 text-primary opacity-20" />
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Badge className={cn(
            "rounded-lg px-2 py-1 font-bold text-[10px] uppercase tracking-wider backdrop-blur-md shadow-lg border",
            course.isPublished 
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
          )}>
            {course.isPublished ? "منشورة" : "مسودة"}
          </Badge>
          {!course.isActive && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 rounded-lg px-2 py-1 font-bold text-[10px] uppercase tracking-wider backdrop-blur-md shadow-lg border">
              موقوفة
            </Badge>
          )}
        </div>

        {/* Level Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="outline" className="bg-black/60 text-white border-white/20 backdrop-blur-md rounded-lg px-2 py-1 font-black text-[10px]">
             Lvl {course.level === "EASY" ? "1" : course.level === "MEDIUM" ? "2" : course.level === "HARD" ? "3" : "4"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-black text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {course.nameAr || course.name}
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {course.code || "NO-CODE"} • {course.instructorName || "بدون محاضر"}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AdminButton variant="ghost" size="icon-sm" className="rounded-full hover:bg-primary/10 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </AdminButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-primary/20 backdrop-blur-xl">
              <DropdownMenuLabel className="font-bold text-xs">خيارات الدورة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(course)} className="font-bold gap-2 cursor-pointer">
                <Edit className="h-4 w-4 text-blue-500" /> تعديل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(course)} className="font-bold gap-2 cursor-pointer">
                <Copy className="h-4 w-4 text-amber-500" /> استنساخ
              </DropdownMenuItem>
              <Link href={`/admin/courses/${course.id}/analytics`}>
                <DropdownMenuItem className="font-bold gap-2 cursor-pointer">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> التحليلات
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleStatus(course)} className="font-bold gap-2 cursor-pointer">
                {course.isPublished ? (
                  <><XCircle className="h-4 w-4 text-orange-500" /> إخفاء</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> نشر</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(course)} className="font-bold gap-2 text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 py-4 border-y border-primary/5">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <Users className="h-3 w-3" />
              <span className="text-[12px] font-black">{course._count?.enrollments || 0}</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">طالب</p>
          </div>
          <div className="text-center space-y-1 border-x border-primary/5">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <Star className="h-3 w-3 fill-amber-500" />
              <span className="text-[12px] font-black">{course.rating || "0.0"}</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">تقييم</p>
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-emerald-500">
              <Clock className="h-3 w-3" />
              <span className="text-[12px] font-black">{course.durationHours || 0}</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">ساعة</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground/60 uppercase">السعر</span>
            <span className="text-xl font-black text-emerald-500">{formatPrice(course.price)}</span>
          </div>
          <div className="flex gap-2">
             <Link href={`/admin/courses/${course.id}`}>
               <AdminButton variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2">
                 <Eye className="h-4 w-4" />
                 عرض
               </AdminButton>
             </Link>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
