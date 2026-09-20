"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Copy, Check, Download, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const AI_SUBJECTS = [
  "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "الجيولوجيا",
  "اللغة العربية", "اللغة الإنجليزية", "اللغة الفرنسية",
  "التاريخ", "الجغرافيا", "الفلسفة والمنطق", "علم النفس",
  "التربية الإسلامية", "الحاسوب",
];

export const AI_YEARS = [
  { value: "1", label: "الصف الأول الثانوي" },
  { value: "2", label: "الصف الثاني الثانوي" },
  { value: "3", label: "الصف الثالث الثانوي" },
];

export function AISectionShell({
  badge,
  title,
  description,
  icon,
  accent = "primary",
  children,
  actions,
}: {
  badge: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/40 p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            {icon}
          </div>
          <div>
            <Badge className="mb-1.5 bg-primary/10 text-primary border-primary/20 text-[11px] font-bold">
              {badge}
            </Badge>
            <h2 className="text-xl font-black text-foreground sm:text-2xl">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </div>
  );
}

export function AIError({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4" role="alert">
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            <RotateCcw className="h-3.5 w-3.5 me-2" />
            إعادة المحاولة
          </Button>
        )}
      </div>
    </div>
  );
}

export function AIResultHeader({
  title,
  onCopy,
  onDownload,
  onReset,
  copied,
}: {
  title: string;
  onCopy?: () => void;
  onDownload?: () => void;
  onReset?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25">
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-lg font-black text-foreground">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {onCopy && (
          <Button variant="outline" size="sm" onClick={onCopy} className="rounded-xl">
            {copied ? <Check className="h-3.5 w-3.5 me-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 me-1.5" />}
            {copied ? "تم النسخ" : "نسخ"}
          </Button>
        )}
        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload} className="rounded-xl">
            <Download className="h-3.5 w-3.5 me-1.5" />
            تنزيل
          </Button>
        )}
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="rounded-xl">
            <RotateCcw className="h-3.5 w-3.5 me-1.5" />
            جديد
          </Button>
        )}
      </div>
    </div>
  );
}

export function AIEmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  // B-11: markup lives in components/ui/empty-state; same signature.
  // Default icon preserved (Sparkles) instead of the canonical Inbox.
  return <EmptyState title={title} description={description} icon={icon ?? Sparkles} />;
}

export function AILoadingButton({ loading, loadingText, children }: { loading: boolean; loadingText: string; children: ReactNode }) {
  if (!loading) return <>{children}</>;
  return (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent me-2" />
      {loadingText}
    </>
  );
}

export function useCopyText() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  };
  return { copied, copy };
}

export function downloadTextFile(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
      {children} {required && <span className="text-destructive">*</span>}
    </label>
  );
}

export function HistoryBar<T>({
  items,
  onSelect,
  onClear,
  renderLabel,
}: {
  items: T[];
  onSelect: (item: T) => void;
  onClear: () => void;
  renderLabel: (item: T, index: number) => string;
}) {
  if (items.length === 0) return null;
  return (
    <Card className="mb-5 rounded-2xl border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-muted-foreground">السجل المحفوظ على جهازك ({items.length}) — اضغط لاسترجاع:</span>
        <button onClick={onClear} className="text-xs font-bold text-destructive hover:underline">
          مسح السجل
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.slice(0, 8).map((item, i) => (
          <button
            key={i}
            onClick={() => onSelect(item)}
            title={renderLabel(item, i)}
            className="max-w-[240px] shrink-0 truncate rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            {renderLabel(item, i)}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}
