"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function AnnouncementTicker() {
  const announcements = [
    "🔥 حقق 145 طالباً رتبة 'المحارب الفضي' اليوم!",
    "📢 مسابقة الكيمياء الكبرى تبدأ بعد 48 ساعة من الآن.",
    "🛡️ تحديث جديد لنظام الدروع الواقية (الخصوصية) متوفر الآن في الإعدادات.",
    "💎 تم مضاعفة نقاط الـ XP في مادة الفيزياء لمدة ساعتين!"
  ];

  return (
    <div className="w-full bg-primary/20 backdrop-blur-md border-y border-primary/20 py-2 overflow-hidden whitespace-nowrap relative">
      {/* Gradient Masks */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background/20 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background/20 to-transparent z-10 pointer-events-none" />
      
      <div className="flex animate-marquee gap-10">
        {[...announcements, ...announcements].map((text, i) => (
          <span key={i} className="text-primary font-bold text-xs flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            {text}
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
