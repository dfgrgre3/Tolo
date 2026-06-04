"use client";

import React from "react";
import { Sparkles, Trophy, Users, Target, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { User } from "@/types/user";

interface FeaturedPromoProps {
  user?: User | null;
  onClose: () => void;
}

export function FeaturedPromo({ user, onClose }: FeaturedPromoProps) {
  const isStudent = !!user;

  return (
    <div
      className="relative flex flex-col justify-between h-full min-h-[320px] p-6 rounded-2xl overflow-hidden border border-primary/25 bg-gradient-to-b from-primary/10 via-primary/5 to-background shadow-md group/promo"
    >
      {/* Static premium background blobs */}
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-primary/15 rounded-full blur-3xl" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 space-y-4">
        {/* Header Badge */}
        <div className="flex items-center gap-1.5 self-start">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {isStudent ? "نشاطك اليومي" : "مستقبلك يبدأ هنا"}
          </span>
        </div>

        {isStudent ? (
          /* Logged In Content */
          <div className="space-y-3.5">
            <h3
              className="text-lg font-extrabold text-foreground leading-snug"
            >
              تحدي اليوم الأكاديمي 🏆
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              قم بحل اختبار الكيمياء السريع اليوم لتحافظ على سلسلة تفوقك وتكسب 50 نقطة إضافية!
            </p>

            {/* Quick stats list */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-background/85 border border-border/80 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3 text-primary" /> الأهداف اليومية
                </span>
                <span className="text-sm font-bold text-foreground">2 / 3 مكتمل</span>
              </div>
              <div className="p-2.5 rounded-xl bg-background/85 border border-border/80 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-500" /> رتبتك الحالية
                </span>
                <span className="text-sm font-bold text-foreground">#15 على دفعتك</span>
              </div>
            </div>
          </div>
        ) : (
          /* Guest Content */
          <div className="space-y-3.5">
            <h3
              className="text-lg font-extrabold text-foreground leading-snug"
            >
              انضم إلى نخبة الطلاب 🚀
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              افتح لوحة تحكم ذكية، وتوصيات مدعومة بالذكاء الاصطناعي، ومنافسات مباشرة مع زملائك في الثانوية العامة.
            </p>

            {/* Interactive Stats */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">+10,000 طالب وطالبة</span>
                  <span className="text-[10px] text-muted-foreground">يتعلمون بنشاط الآن</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">أفضل معلمي المملكة</span>
                  <span className="text-[10px] text-muted-foreground">يشرحون المناهج بالتفصيل</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA Button */}
      <div className="relative z-10 pt-4">
        {isStudent ? (
          <Link href="/exams/quick" onClick={onClose} className="block w-full">
            <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/95 text-primary-foreground shadow-md shadow-primary/15 transition-colors duration-200 font-bold group/btn">
              <span>ابدأ التحدي الآن</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Link href="/register" onClick={onClose} className="block w-full">
            <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/95 text-primary-foreground shadow-md shadow-primary/15 transition-colors duration-200 font-bold group/btn">
              <span>سجل مجاناً اليوم</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

