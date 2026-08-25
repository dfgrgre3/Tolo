"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

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
    </div>
  );
}
