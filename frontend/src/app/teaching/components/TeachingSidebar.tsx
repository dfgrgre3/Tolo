"use client";

import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  MessageSquare,
  Star,
  BarChart3,
  CreditCard,
  Calendar,
  Settings,
  HelpCircle,
  GraduationCap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarLink {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TeachingSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCloseMobile?: () => void;
}

export default function TeachingSidebar({
  activeTab,
  setActiveTab,
  onCloseMobile,
}: TeachingSidebarProps) {
  const menuItems: SidebarLink[] = [
    { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { id: "courses", label: "إدارة الكورسات", icon: BookOpen },
    { id: "students", label: "الطلاب", icon: Users },
    { id: "messages", label: "الرسائل", icon: MessageSquare },
    { id: "reviews", label: "التقييمات", icon: Star },
    { id: "analytics", label: "التحليلات", icon: BarChart3 },
    { id: "earnings", label: "الأرباح", icon: CreditCard },
    { id: "calendar", label: "التقويم الدراسي", icon: Calendar },
    { id: "settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-card border-l border-slate-200 dark:border-slate-800 text-right w-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-850">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
              TOLO للتدريس
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">لوحة تحكم المعلم</p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Menu Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-250 dark:hover:bg-slate-800/40"
              )}
            >
              {isActive && (
                <span className="absolute right-0 top-3 bottom-3 w-1 bg-primary rounded-l-md" />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-650"
                )}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Support footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <a
          href="/support"
          className="flex items-center gap-3 px-4 py-3 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>الدعم الفني والمساعدة</span>
        </a>
      </div>
    </div>
  );
}
