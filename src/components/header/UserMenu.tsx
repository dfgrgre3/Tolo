"use client";

import React from "react";
import Link from "next/link";
import { 
  User, 
  Settings, 
  LayoutDashboard, 
  LogOut, 
  Bell, 
  Shield, 
  CreditCard 
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full border-2 border-primary/10 p-0 hover:border-primary/30 transition-all overflow-hidden"
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={user.avatar || undefined} alt={user.name || user.email} />
            <AvatarFallback className="bg-primary/5 text-primary font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* Online status indicator */}
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 py-1">
            <p className="text-sm font-bold leading-none">{user.name || user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <Link href="/dashboard">
            <DropdownMenuItem className="cursor-pointer gap-2 py-2">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span>لوحة التحكم</span>
            </DropdownMenuItem>
          </Link>
          
          <Link href="/profile">
            <DropdownMenuItem className="cursor-pointer gap-2 py-2">
              <User className="h-4 w-4 text-primary" />
              <span>الملف الشخصي</span>
            </DropdownMenuItem>
          </Link>
          
          <Link href="/settings">
            <DropdownMenuItem className="cursor-pointer gap-2 py-2">
              <Settings className="h-4 w-4 text-primary" />
              <span>الإعدادات</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer gap-2 py-2">
            <Bell className="h-4 w-4 text-primary" />
            <span>الإشعارات</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem className="cursor-pointer gap-2 py-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>الأمان</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer gap-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
