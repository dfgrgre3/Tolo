
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/shared/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/avatar';
import { Badge } from '@/shared/badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Menu,
  BookOpen,
  PenTool,
  Award,
  Calendar,
  MessageSquare,
  Library,
  BarChart3,
  Users,
  Trophy,
  Target,
  Clock,
  Lightbulb,
  FileText,
  Home
} from 'lucide-react';

interface HeaderMobileProps {
  pathname: string;
  user: any;
  isAuthenticated: boolean;
}

export function HeaderMobile({ pathname, user, isAuthenticated }: HeaderMobileProps) {
  const [notificationsCount] = useState(3);

  // تحديد الروابط النشطة
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const NavItems = () => (
    <div className="flex flex-col gap-4 py-4">
      <Link href="/home-sections" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md ${isActive('/home-sections') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Home className="h-4 w-4" />
        الرئيسية
      </Link>

      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">التعلم</div>
      <Link href="/courses" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/courses') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <BookOpen className="h-4 w-4" />
        الدورات التعليمية
      </Link>
      <Link href="/exams" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/exams') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <PenTool className="h-4 w-4" />
        الاختبارات
      </Link>
      <Link href="/resources" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/resources') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Library className="h-4 w-4" />
        المصادر التعليمية
      </Link>

      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">إدارة التعلم</div>
      <Link href="/tasks" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/tasks') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <FileText className="h-4 w-4" />
        المهام
      </Link>
      <Link href="/schedule" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/schedule') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Calendar className="h-4 w-4" />
        الجدول الزمني
      </Link>
      <Link href="/time" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/time') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Clock className="h-4 w-4" />
        إدارة الوقت
      </Link>
      <Link href="/progress" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/progress') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <BarChart3 className="h-4 w-4" />
        التقدم
      </Link>

      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">المجتمع</div>
      <Link href="/forum" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/forum') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <MessageSquare className="h-4 w-4" />
        المنتدى
      </Link>
      <Link href="/events" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/events') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Calendar className="h-4 w-4" />
        الأحداث
      </Link>

      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">أدوات ذكية</div>
      <Link href="/achievements" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/achievements') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Award className="h-4 w-4" />
        الإنجازات
      </Link>
      <Link href="/library" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/library') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Library className="h-4 w-4" />
        المكتبة
      </Link>
      <Link href="/ai" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/ai') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Lightbulb className="h-4 w-4" />
        مساعد الذكاء الاصطناعي
      </Link>
      <Link href="/tips" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mr-4 ${isActive('/tips') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
        <Lightbulb className="h-4 w-4" />
        نصائح تعليمية
      </Link>
    </div>
  );

  return (
    <div className="flex h-16 items-center justify-between px-4">
      {/* الشعار وزر القائمة */}
      <div className="flex items-center space-x-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">فتح القائمة</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>القائمة</SheetTitle>
              <SheetDescription>
                استكشف جميع أقسام المنصة التعليمية
              </SheetDescription>
            </SheetHeader>
            <NavItems />

            {!isAuthenticated && (
              <div className="mt-6 px-3 py-4 border-t">
                <Button asChild className="w-full">
                  <Link href="/login">تسجيل الدخول</Link>
                </Button>
                <Button variant="outline" asChild className="w-full mt-2">
                  <Link href="/login?view=register">إنشاء حساب</Link>
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/globe.svg"
            alt="Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="font-bold text-lg">
            تعليمي
          </span>
        </Link>
      </div>

      {/* الأزرار اليمنى */}
      <div className="flex items-center space-x-2">
        {/* زر الإشعارات */}
        {isAuthenticated && (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {notificationsCount}
            </span>
            <span className="sr-only">الإشعارات</span>
          </Button>
        )}

        {/* زر تبديل الثيم */}
        <ThemeToggle />

        {/* القائمة المنسدلة للمستخدم */}
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>الملف الشخصي</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>الإعدادات</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* أزرار تسجيل الدخول والتسجيل */}
        {!isAuthenticated && (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild>
              <Link href="/login?view=register">إنشاء حساب</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
