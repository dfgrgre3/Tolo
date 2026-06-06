"use client";

import React, { memo, useState, useCallback } from "react";
import {
  Zap,
  Battery,
  Gauge,
  Sparkles,
  Smartphone,
  Wifi,
  Cpu,
  Monitor,
  HardDrive,
  BatteryLow,
  Signal,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEfficiency, type PerformanceMode } from "@/hooks/use-efficiency";
import { useEfficiencyMode, useUltraLiteMode } from "@/hooks/use-efficiency-mode";

/**
 * PerformanceSettings - Compact button in the header to let users
 * manually switch between performance modes.
 *
 * Modes:
 *  - auto:        detected by device capabilities
 *  - performance: full effects (high-end devices)
 *  - balanced:    some effects reduced
 *  - lite:        most effects disabled
 *  - saver:       all heavy effects disabled
 *  - ultra-lite:  extreme reduction for very weak devices
 */
const MODE_LABELS: Record<
  PerformanceMode,
  { label: string; description: string; icon: React.ReactNode; color?: string }
> = {
  auto: {
    label: "تلقائي",
    description: "يختار الموقع الوضع الأمثل لجهازك تلقائياً",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  performance: {
    label: "أداء عالي",
    description: "جميع التأثيرات والرسوم المتحركة (للأجهزة القوية)",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  balanced: {
    label: "متوازن",
    description: "تقليل بعض التأثيرات (للأجهزة المتوسطة)",
    icon: <Gauge className="h-3.5 w-3.5" />,
  },
  lite: {
    label: "خفيف",
    description: "تعطيل التأثيرات الثقيلة (للأجهزة الضعيفة)",
    icon: <Battery className="h-3.5 w-3.5" />,
  },
  saver: {
    label: "توفير الطاقة",
    description: "تعطيل كل التأثيرات (للاتصال البطيء أو البطارية المنخفضة)",
    icon: <Wifi className="h-3.5 w-3.5" />,
  },
  "ultra-lite": {
    label: "خفيف جداً",
    description: "أقصى تخفيف (لأجهزة 2G، 2GB RAM، GPU ضعيف)",
    icon: <BatteryLow className="h-3.5 w-3.5" />,
  },
};

export const PerformanceSettings = memo(function PerformanceSettings() {
  const { mode, setMode, capabilities, effectiveMode, isAutoDetected, redetect } = useEfficiency();
  // We also re-read DOM class so we re-render when the class changes from elsewhere
  const domMode = useEfficiencyMode();
  const isUltraLite = useUltraLiteMode();
  const [open, setOpen] = useState(false);

  const currentMode = mode;
  const currentLabel = MODE_LABELS[currentMode];
  const isLight = effectiveMode === "lite" || effectiveMode === "saver" || effectiveMode === "ultra-lite";

  // Compute the device "grade" for display
  const deviceGrade = useCallback(() => {
    const score = capabilities.score;
    if (score >= 75) return { grade: "ممتاز", color: "text-green-500" };
    if (score >= 50) return { grade: "جيد", color: "text-blue-500" };
    if (score >= 35) return { grade: "متوسط", color: "text-yellow-500" };
    if (score >= 20) return { grade: "ضعيف", color: "text-orange-500" };
    return { grade: "ضعيف جداً", color: "text-red-500" };
  }, [capabilities.score]);

  const grade = deviceGrade();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative transition-all duration-200 group",
            isUltraLite && "text-red-500 bg-red-500/10",
            isLight && !isUltraLite && "text-amber-500 bg-amber-500/10",
            !isLight && isAutoDetected && "text-primary/80"
          )}
          title={`وضع الأداء: ${currentLabel.label}`}
          aria-label="إعدادات الأداء"
        >
          {currentLabel.icon}
          {isLight && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                isUltraLite ? "bg-red-500" : "bg-amber-500"
              )}
              aria-hidden
            />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-w-[92vw]">
        <DropdownMenuLabel className="flex flex-col items-start gap-0.5 py-2">
          <div className="flex items-center gap-2 font-semibold">
            <Gauge className="h-4 w-4" />
            <span>وضع الأداء</span>
            <span className={cn("text-xs font-normal mr-auto", grade.color)}>
              ({grade.grade})
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-normal">
            الحالي:{" "}
            {isUltraLite
              ? "خفيف جداً"
              : domMode
                ? "خفيف"
                : MODE_LABELS[mode].label}
            {isAutoDetected && " (تلقائي)"}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as PerformanceMode)}
          className="p-1 max-h-[280px] overflow-y-auto"
        >
          {(Object.keys(MODE_LABELS) as PerformanceMode[]).map((m) => {
            const info = MODE_LABELS[m];
            const isAuto = m === "auto";
            const isUltra = m === "ultra-lite";
            return (
              <DropdownMenuRadioItem
                key={m}
                value={m}
                className="flex items-start gap-2 py-2 cursor-pointer"
                textValue={info.label}
              >
                <div className="flex flex-col gap-0.5 w-full">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {info.icon}
                    <span>{info.label}</span>
                    {isAuto && isAutoDetected && (
                      <span className="text-[10px] text-primary">(نشط)</span>
                    )}
                    {isUltra && (
                      <span className="text-[10px] text-red-500 mr-1">لأجهزة ضعيفة</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground pr-5 leading-snug">
                    {info.description}
                  </span>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Device info panel */}
        <div className="px-2 py-2 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              <span>الجهاز</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                redetect();
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="إعادة الكشف"
              title="إعادة الكشف"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تقييم:</span>
            <span className={cn("font-mono font-semibold", grade.color)}>
              {capabilities.score}/100 ({grade.grade})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              <span>الذاكرة:</span>
            </span>
            <span className="font-mono">
              {capabilities.deviceMemory != null ? `${capabilities.deviceMemory} GB` : "غير معروف"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="h-3 w-3" />
              <span>المعالج:</span>
            </span>
            <span className="font-mono">
              {capabilities.hardwareConcurrency != null
                ? `${capabilities.hardwareConcurrency} أنوية`
                : "غير معروف"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Signal className="h-3 w-3" />
              <span>الشبكة:</span>
            </span>
            <span className="font-mono">
              {capabilities.effectiveType}
              {capabilities.saveData && (
                <span className="text-amber-500 mr-1">(توفير)</span>
              )}
            </span>
          </div>

          {capabilities.gpuType !== "unknown" && capabilities.gpuType !== "hardware" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">GPU:</span>
              <span className={cn("font-mono", capabilities.gpuType === "software" && "text-red-500")}>
                {capabilities.gpuType === "software" ? "برمجي" : capabilities.gpuType === "weak" ? "ضعيف" : capabilities.gpuType === "none" ? "لا يوجد" : "—"}
              </span>
            </div>
          )}

          {capabilities.lowBattery && (
            <div className="flex items-center gap-1.5 pt-1 text-amber-600">
              <BatteryLow className="h-3 w-3" />
              <span className="font-semibold">البطارية منخفضة</span>
            </div>
          )}

          {capabilities.isMobile && (
            <div className="flex items-center gap-1.5 pt-1 border-t mt-1.5 text-muted-foreground">
              <Smartphone className="h-3 w-3" />
              <span>
                {capabilities.isTablet ? "جهاز لوحي" : "جهاز محمول"}
                {capabilities.osName !== "unknown" && ` • ${capabilities.osName}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1.5 border-t mt-1.5 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 shrink-0" />
            <span>
              يتم اختيار الوضع الأمثل تلقائياً بناءً على هذه المعطيات.
            </span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
