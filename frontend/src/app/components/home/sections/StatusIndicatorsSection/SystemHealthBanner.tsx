"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface SystemHealthBannerProps {
  onlineCount: number;
  totalCount: number;
}

export const SystemHealthBanner = ({ onlineCount, totalCount }: SystemHealthBannerProps) => {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3 }}
      className="mt-8"
    >
      <Card className="border border-white/10 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] rounded-2xl mx-1">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-white gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-500/20 p-4 backdrop-blur-md border border-emerald-500/30 shadow-inner">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1 drop-shadow-sm">حالة النظام ممتازة</h3>
                <p className="text-emerald-200/80 text-sm">
                  جميع الخدمات تعمل بشكل طبيعي
                </p>
              </div>
            </div>
            <div className="text-center md:text-right bg-black/20 px-6 py-3 rounded-2xl border border-white/5">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                {onlineCount}/{totalCount}
              </div>
              <div className="text-sm text-emerald-200/60 font-medium">خدمات نشطة</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default SystemHealthBanner;
