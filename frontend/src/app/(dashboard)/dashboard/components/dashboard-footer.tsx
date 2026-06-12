"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardFooter() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between pt-12 pb-12 border-t border-white/5 gap-8">
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 text-xs font-bold text-gray-600">
        <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-full">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
          <span>استقرار النظام: 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span>السرعة: 18ms</span>
        </div>
        <span>تحديث الإصدار: V5.1 (Alpha)</span>
      </div>
      
      <div className="flex items-center gap-4">
        <Button size="icon" variant="ghost" className="h-12 w-12 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5" asChild>
          <Link href="/settings"><Settings className="w-5 h-5" /></Link>
        </Button>
        <Button size="icon" variant="ghost" className="h-12 w-12 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5" asChild>
          <Link href="/profile"><User className="w-5 h-5" /></Link>
        </Button>
      </div>
    </div>
  );
}
