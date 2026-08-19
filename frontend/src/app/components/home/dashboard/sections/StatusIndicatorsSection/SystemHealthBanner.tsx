"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface SystemHealthBannerProps {
  onlineCount: number;
  totalCount: number;
}

/** Summarizes the indicators above, reflecting the counts it is given. */
export const SystemHealthBanner = ({ onlineCount, totalCount }: SystemHealthBannerProps) => {
  const allHealthy = totalCount > 0 && onlineCount === totalCount;

  const theme = allHealthy
    ? {
        wrapper: "from-emerald-500/20 to-teal-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]",
        iconBox: "bg-emerald-500/20 border-emerald-500/30",
        icon: <CheckCircle2 className="h-8 w-8 text-emerald-400" />,
        title: "جميع المؤشرات سليمة",
        subtitle: "كل الخدمات تعمل بشكل طبيعي",
        accent: "from-emerald-300 to-teal-300",
        muted: "text-emerald-200/60",
      }
    : {
        wrapper: "from-amber-500/20 to-orange-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]",
        iconBox: "bg-amber-500/20 border-amber-500/30",
        icon: <AlertTriangle className="h-8 w-8 text-amber-400" />,
        title: "بعض المؤشرات تحتاج انتباهك",
        subtitle: `${totalCount - onlineCount} مؤشر خارج الحالة الطبيعية`,
        accent: "from-amber-300 to-orange-300",
        muted: "text-amber-200/60",
      };

  return (
    <div
      className="mt-8"
    >
      <Card className={`border border-white/10 bg-gradient-to-r ${theme.wrapper} backdrop-blur-xl rounded-2xl mx-1`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-white gap-4">
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-4 backdrop-blur-md border shadow-inner ${theme.iconBox}`}>
                {theme.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1 drop-shadow-sm">{theme.title}</h3>
                <p className={`${theme.muted} text-sm`}>{theme.subtitle}</p>
              </div>
            </div>
            <div className="text-center md:text-right bg-black/20 px-6 py-3 rounded-2xl border border-white/5">
              <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.accent}`}>
                {onlineCount}/{totalCount}
              </div>
              <div className={`text-sm ${theme.muted} font-medium`}>مؤشر سليم</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealthBanner;
