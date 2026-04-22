"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Settings,

  LogOut,
  Bell,
  Shield,
  CreditCard,

  Moon,
  Sun,
  HelpCircle,
  ChevronRight,
  Crown } from
"lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger } from
"@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { logger } from '@/lib/logger';
import { saveSettingsPreferences } from "@/app/(dashboard)/settings/preferences-client";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = useMemo(
    () =>
    user?.name ?
    user.name.split(" ").map((n) => n[0]).join("").toUpperCase() :
    user?.email?.[0]?.toUpperCase() ?? "",
    [user?.name, user?.email]
  );

  const handleLogout = useCallback(async () => {
    if (!user) return;
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      logger.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, isLoggingOut]);

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (user?.id) {
      try {
        await saveSettingsPreferences({
          appearance: { theme: nextTheme }
        });
      } catch (error) {
        logger.error("Failed to sync theme preference in UserMenu:", error);
      }
    }
  }, [theme, setTheme, user?.id]);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full border-2 border-primary/10 p-0 hover:border-primary/30 transition-all overflow-hidden touch-manipulation group"
          aria-label="قائمة المستخدم">
          
          <Avatar className="h-full w-full">
            <AvatarImage src={user.avatar || undefined} alt={user.name || user.email} />
            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <motion.span
            className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }} />
          
          <div className="absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 py-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-none">{user.name || user.username}</p>
              {user.role === "ADMIN" &&
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  <Crown className="h-2.5 w-2.5 ml-1" />
                  مسؤول
                </Badge>
              }
              {user.role === "PREMIUM" &&
              <Badge variant="default" className="text-xs px-1.5 py-0 bg-gradient-to-r from-amber-500 to-amber-600">
                  مميز
                </Badge>
              }
            </div>
            <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
            {(user as any).subscription &&
            <p className="text-xs text-primary font-medium mt-1">
                {(user as any).subscription.plan} - ينتهي {new Date((user as any).subscription.endDate).toLocaleDateString('ar-EG')}
              </p>
            }
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>


          {user.role === "ADMIN" &&
          <Link href="/admin">
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2.5 font-bold text-red-500 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 touch-manipulation">
                <Shield className="h-4 w-4 animate-pulse text-red-500" />
                <span>لوحة الإدارة</span>
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </DropdownMenuItem>
            </Link>
          }

          <Link href="/settings">
            <DropdownMenuItem className="cursor-pointer gap-2.5 py-2.5 touch-manipulation">
              <Settings className="h-4 w-4 text-primary" />
              <span>الإعدادات</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2.5 py-2.5 touch-manipulation">
              <Bell className="h-4 w-4 text-primary" />
              <span>الإشعارات</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
                <span>جميع الإشعارات</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
                <span>إشعارات غير مقروءة</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
                <span>إعدادات الإشعارات</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2.5 py-2.5 touch-manipulation">
              <Shield className="h-4 w-4 text-primary" />
              <span>الخصوصية والأمان</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
                <span>إعدادات الخصوصية</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
                <span>الأمان</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
                <span>حظر المستخدمين</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 py-2.5 touch-manipulation"
            onClick={toggleTheme}>
            
            {theme === "dark" ?
            <Sun className="h-4 w-4 text-primary" /> :

            <Moon className="h-4 w-4 text-primary" />
            }
            <span>تبديل الم٪ر</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer gap-2.5 py-2.5 touch-manipulation">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>المساعدة والدعم</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
          </DropdownMenuItem>

          <Link href="/subscription">
            <DropdownMenuItem className="cursor-pointer gap-2.5 py-2.5 touch-manipulation">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>الاشتراك والفواتير</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className={cn(
            "cursor-pointer gap-2.5 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive touch-manipulation",
            isLoggingOut && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleLogout}
          disabled={isLoggingOut}>
          
          {isLoggingOut ?
          <motion.div
            className="h-4 w-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            
              <LogOut className="h-4 w-4" />
            </motion.div> :

          <LogOut className="h-4 w-4" />
          }
          <span>{isLoggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>);

}