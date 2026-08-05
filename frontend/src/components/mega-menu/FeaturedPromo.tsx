"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { Sparkles, ArrowUpLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { User } from "@/types/user";
import { UserRole } from "@/types/enums";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

// ==========================================
// Types - كل شيء معرف هنا، لا بيانات مدمجة
// ==========================================

export interface PromoStat {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

export interface PromoFeature {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

export interface PromoContent {
  badge: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  /** إحصائيات حقيقية (للطلاب عادةً) */
  stats?: PromoStat[];
  /** مميزات عامة (للضيوف عادةً) */
  features?: PromoFeature[];
}

interface FeaturedPromoProps {
  user?: User | null;
  /** المحتوى الحقيقي - اختياري للعرض التلقائي */
  content?: PromoContent;
  onClose?: () => void;
  className?: string;
  enableTracking?: boolean;
}

// ==========================================
// Tracking Utility
// ==========================================

function trackPromoEvent(
  eventType: 'view' | 'click',
  userType: string,
  metadata?: Record<string, unknown>
) {
  const payload = JSON.stringify({
    type: eventType,
    component: 'featured_promo',
    userType,
    timestamp: Date.now(),
    ...metadata,
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/analytics/promo', payload);
    if (!sent) fallbackTrack(payload);
  } else {
    fallbackTrack(payload);
  }
}

function fallbackTrack(payload: string) {
  fetch('/api/analytics/promo', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(e => logger.debug('Promo fallback track failed:', e));
}

// ==========================================
// Component - Pure Presentational, Zero Mock Data
// ==========================================

export const FeaturedPromo = memo(function FeaturedPromo({
  user,
  content,
  onClose,
  className,
  enableTracking = true,
}: FeaturedPromoProps) {
  const isStudent = !!user && 'role' in user && user.role === UserRole.STUDENT;
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (enableTracking && !hasTrackedViewRef.current) {
      trackPromoEvent('view', isStudent ? 'student' : 'guest');
      hasTrackedViewRef.current = true;
    }
  }, [enableTracking, isStudent]);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  const handleCtaClick = useCallback(() => {
    if (enableTracking && content) {
      trackPromoEvent('click', isStudent ? 'student' : 'guest', {
        ctaText: content.cta,
        href: content.href,
      });
    }
  }, [enableTracking, isStudent, content?.cta, content?.href]);

  const hasStats = content?.stats && content.stats.length > 0;
  const hasFeatures = content?.features && content.features.length > 0;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between h-full p-6 rounded-3xl overflow-hidden",
        "border border-primary/20 bg-gradient-to-b from-primary/10 via-primary/5 to-background shadow-md",
        "hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 ease-out contain-layout",
        className
      )}
      role="region"
      aria-label={content?.title}
    >
      {/* زر الإغلاق */}
      {onClose && (
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 z-20 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="إغلاق البطاقة الترويجية"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* خلفيات تزيينية */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" aria-hidden="true" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none z-0" aria-hidden="true" />

      <div className="relative z-10 space-y-4">
        {/* شارة العنوان */}
        <div className="flex items-center gap-1.5 self-start">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary animate-pulse" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {content?.badge}
          </span>
        </div>

        {/* المحتوى */}
        <div className="space-y-3.5">
          <h3 className="text-lg font-extrabold text-foreground leading-snug">
            {content?.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {content?.desc}
          </p>

          {/* إحصائيات حقيقية فقط */}
          {hasStats && (
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {content.stats!.map((stat) => (
                <div key={stat.label} className="p-2.5 rounded-xl bg-background/85 border border-border/80 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <stat.icon className={cn("h-3 w-3", stat.color)} aria-hidden="true" />
                    {stat.label}
                  </span>
                  <span className="text-sm font-bold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* مميزات حقيقية فقط */}
          {!hasStats && hasFeatures && (
            <div className="space-y-2 pt-2">
              {content!.features!.map((feat) => (
                <div key={feat.title} className="flex items-center gap-2 text-xs">
                  <div className={cn("p-1.5 rounded-lg flex-shrink-0", feat.color)}>
                    <feat.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">{feat.title}</span>
                    <span className="text-[10px] text-muted-foreground">{feat.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* حالة لا بيانات - صريحة وواضحة */}
          {!hasStats && !hasFeatures && (
            <div className="pt-2 p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground">لا توجد بيانات متاحة حالياً</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      {content && (
        <div className="relative z-10 pt-4 mt-auto">
          <Button
            asChild
            className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/95 text-primary-foreground shadow-md shadow-primary/15 transition-colors duration-200 font-bold active:scale-[0.99]"
            aria-label={`${content.cta} - ينتقل بك إلى ${content.href}`}
          >
            <Link href={content.href} onClick={handleCtaClick}>
              <span>{content.cta}</span>
              <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
});