"use client";

import React, { useState } from "react";
import { Bell, Menu, Search, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationItem } from "../hooks/use-teaching-data";

interface TeachingHeaderProps {
  activeTab: string;
  onOpenMobileSidebar: () => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  user: {
    name: string | null;
    avatar: string | null;
    email: string;
  } | null;
  logout: () => void;
}

export default function TeachingHeader({
  activeTab,
  onOpenMobileSidebar,
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
  user,
  logout,
}: TeachingHeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const tabTitles: Record<string, string> = {
    dashboard: "لوحة التحكم الرئيسية",
    courses: "إدارة الكورسات والمناهج",
    quizzes: "الاختبارات وأداء الطلاب",
    students: "قائمة الطلاب ومتابعة الأداء",
    messages: "صندوق الرسائل والمحادثات",
    reviews: "تقييمات وآراء الطلاب",
    analytics: "التحليلات والتقارير الشاملة",
    earnings: "الأرباح وإدارة السحوبات",
    calendar: "التقويم الدراسي والجدول",
    settings: "إعدادات حساب المعلم",
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-card/85 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 w-full text-right" dir="rtl">
      {/* Right Section: Mobile menu + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-base lg:text-lg font-bold text-slate-800 dark:text-slate-150">
          {tabTitles[activeTab] || "لوحة التدريس"}
        </h2>
      </div>

      {/* Left Section: Search, Theme, Notifications, Profile */}
      <div className="flex items-center gap-4">
        {/* Search Input (hidden on small screens) */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في لوحة التحكم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-right pr-9 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-350" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-card animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden text-right">
            <div className="flex items-center justify-between p-4 bg-slate-55/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الإشعارات ({unreadCount} غير مقروء)</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-[10px] text-primary hover:underline font-medium"
                >
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">لا توجد إشعارات جديدة</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 flex flex-col gap-1 transition-colors ${
                      notif.read ? "bg-card hover:bg-slate-50 dark:hover:bg-slate-800/20" : "bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{notif.title}</span>
                      <span className="text-[9px] text-slate-450">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{notif.body}</p>
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-[10px] text-primary self-end flex items-center gap-1 font-medium mt-1 hover:underline"
                      >
                        <Check className="w-3 h-3" />
                        تعليم كمقروء
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-85 focus:outline-none">
              <Avatar className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800">
                <AvatarImage src={user?.avatar || ""} alt={user?.name || "معلم"} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.name?.slice(0, 2) || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border-slate-200 dark:border-slate-800 text-right">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{user?.name || "معلم منصة TOLO"}</div>
              <div className="text-[10px] text-slate-450 truncate">{user?.email || "teacher@tolo.edu"}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="border-slate-100 dark:border-slate-850" />
            <DropdownMenuItem onClick={() => window.location.href = "/"} className="rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer">
              زيارة واجهة الطلاب
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="rounded-xl px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer">
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
