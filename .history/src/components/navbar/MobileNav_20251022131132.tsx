
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  BookOpen, 
  FileText, 
  Brain, 
  Trophy, 
  User, 
  Settings, 
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  MessageSquare,
  Calendar,
  Target,
  BarChart3,
  Library,
  Users,
  Award,
  Clock,
  PenTool,
  Search,
  Bell
} from 'lucide-react';
import { Button } from '@/shared/button';
import { Badge } from '@/shared/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/UserProvider';
import { cn } from '@/lib/utils';

const MobileNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenus(prev => 
      prev.includes(menu) 
        ? prev.filter(item => item !== menu)
        : [...prev, menu]
    );
  };

  const isActive = (path: string) => pathname === path;

  const closeMenu = () => setIsOpen(false);

  const navItems = [
    {
      title: 'الرئيسية',
      href: '/',
      icon: Home,
    },
    {
      title: 'التعلم',
      icon: BookOpen,
      submenu: [
        { title: 'الدورات التعليمية', href: '/courses', icon: BookOpen },
        { title: 'الامتحانات', href: '/exams', icon: FileText },
        { title: 'المكتبة الرقمية', href: '/library', icon: Library },
        { title: 'الذكاء الاصطناعي', href: '/ai', icon: Brain, badge: 'جديد' },
      ],
    },
    {
      title: 'الأدوات',
      icon: PenTool,
      submenu: [
        { title: 'مركز المهام', href: '/tasks', icon: FileText },
        { title: 'الجدول الزمني', href: '/schedule', icon: Calendar },
        { title: 'الأهداف', href: '/goals', icon: Target },
        { title: 'متابعة الوقت', href: '/time', icon: Clock },
      ],
    },
    {
      title: 'المجتمع',
      icon: Users,
      submenu: [
        { title: 'المنتدى التعليمي', href: '/forum', icon: MessageSquare },
        { title: 'المدونة', href: '/blog', icon: FileText },
        { title: 'الدردشة', href: '/chat', icon: MessageSquare },
        { title: 'الإعلانات والمسابقات', href: '/announcements', icon: Bell },
      ],
    },
    {
      title: 'التقدم',
      icon: BarChart3,
      submenu: [
        { title: 'نظرة عامة على التقدم', href: '/progress', icon: BarChart3 },
        { title: 'التحليلات المتقدمة', href: '/analytics', icon: BarChart3 },
        { title: 'الإنجازات', href: '/achievements', icon: Trophy },
        { title: 'لوحة المتصدرين', href: '/leaderboard', icon: Award },
      ],
    },
  ];

  const userMenuItems = [
    {
      title: 'الملف الشخصي',
      href: '/profile',
      icon: User,
    },
    {
      title: 'الإعدادات',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">فتح القائمة</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="pr-0">
        <SheetHeader className="px-7">
          <SheetTitle className="text-right">القائمة</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto py-6 pr-6">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <div key={item.title}>
                {item.submenu ? (
                  <div>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between text-base",
                        isActive(item.href) && "bg-muted font-medium"
                      )}
                      onClick={() => toggleSubmenu(item.title)}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </div>
                      {openSubmenus.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    {openSubmenus.includes(item.title) && (
                      <div className="grid gap-1 pr-6 pt-1">
                        {item.submenu.map((subItem) => (
                          <Button
                            key={subItem.href}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-base",
                              isActive(subItem.href) && "bg-muted font-medium"
                            )}
                            asChild
                          >
                            <Link href={subItem.href} onClick={closeMenu}>
                              <div className="flex items-center gap-2">
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                                {subItem.badge && (
                                  <Badge variant="secondary" className="ml-auto text-xs">
                                    {subItem.badge}
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-base",
                      isActive(item.href) && "bg-muted font-medium"
                    )}
                    asChild
                  >
                    <Link href={item.href} onClick={closeMenu}>
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {user && (
            <div className="grid gap-2">
              <div className="flex items-center gap-2 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5 text-sm not-italic leading-none">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>

              {userMenuItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-base",
                    isActive(item.href) && "bg-muted font-medium"
                  )}
                  asChild
                >
                  <Link href={item.href} onClick={closeMenu}>
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                </Button>
              ))}

              <Separator />

              <Button
                variant="ghost"
                className="w-full justify-start text-base text-destructive hover:text-destructive"
                onClick={() => {
                  logout();
                  closeMenu();
                }}
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-5 w-5" />
                  <span>تسجيل الخروج</span>
                </div>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
