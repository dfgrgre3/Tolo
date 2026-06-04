"use client";

import * as React from "react";
import {
  CheckCircle2,
  Loader2,
  Save,
  Clock,
  Video,
  Image as ImageIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Label (local) ───────────────────────────────────────────────────────────
export const Label = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <label
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
  >
    {children}
  </label>
);

// ─── HealthCheckItem ─────────────────────────────────────────────────────────
/** Small helper: renders a check icon or a "missing" badge */
export const HealthCheckItem = ({
  label,
  isValid,
  invalidText = "ناقص",
}: {
  label: string;
  isValid: boolean;
  invalidText?: string;
}) => (
  <div className="flex items-center justify-between text-[11px]">
    <span className="text-muted-foreground">{label}</span>
    {isValid ? (
      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
    ) : (
      <Badge variant="outline" className="h-4 px-1 text-[8px]">
        {invalidText}
      </Badge>
    )}
  </div>
);

// ─── SubmitIcon ──────────────────────────────────────────────────────────────
/** Submit button icon */
export const SubmitIcon = ({
  isSubmitting,
  size = "4",
}: {
  isSubmitting: boolean;
  size?: string;
}) =>
  isSubmitting ? (
    <Loader2 className={`h-${size} w-${size} animate-spin`} />
  ) : (
    <Save className={`h-${size} w-${size}`} />
  );

// ─── StatusBadge ─────────────────────────────────────────────────────────────
/** Publish status badge */
export const StatusBadge = ({ isPublished }: { isPublished: boolean }) => (
  <Badge
    variant="outline"
    className={cn(
      "h-9 px-3 font-bold",
      isPublished
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
        : "border-orange-500/20 bg-orange-500/10 text-orange-500",
    )}
  >
    {isPublished ? "منشورة" : "مسودة"}
  </Badge>
);

// ─── TrailerPreview ──────────────────────────────────────────────────────────
/** Trailer video preview */
export const TrailerPreview = ({
  trailerUrl,
  isDirectVideo,
  youtubeEmbedUrl,
}: {
  trailerUrl?: string | null;
  isDirectVideo: boolean;
  youtubeEmbedUrl?: string | null;
}) => {
  if (!trailerUrl) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
        <Video className="h-12 w-12 mb-2 opacity-20" />
        <span className="text-xs font-bold">رابط الفيديو الدعائي</span>
      </div>
    );
  }
  if (isDirectVideo) {
    return (
      <video src={trailerUrl} controls preload="metadata" className="h-full w-full bg-black object-contain" />
    );
  }
  if (youtubeEmbedUrl) {
    return (
      <iframe
        src={youtubeEmbedUrl}
        title="Trailer Preview"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <Video className="h-12 w-12 text-primary animate-pulse" />
      <span className="absolute bottom-4 left-4 text-[10px] text-white/50">{trailerUrl}</span>
    </div>
  );
};

// ─── ThumbnailPreview ────────────────────────────────────────────────────────
/** Thumbnail preview */
export const ThumbnailPreview = ({ url }: { url?: string | null }) => {
  if (url) {
    return <img src={url} alt="Thumbnail Preview" className="w-full h-full object-cover" />;
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
      <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
      <span className="text-xs font-bold">لم يتم اختيار صورة بعد</span>
    </div>
  );
};

// ─── TrailerMetaInfo ─────────────────────────────────────────────────────────
/** Trailer duration / metadata info box */
export const TrailerMetaInfo = ({
  durationMinutes,
  fileName,
}: {
  durationMinutes?: number | null;
  fileName?: string | null;
}) => {
  if (!durationMinutes) return null;
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-bold text-primary">
        <Clock className="h-4 w-4" />
        <span>مدة الفيديو المستخرجة: {durationMinutes} دقيقة</span>
      </div>
      {fileName ? (
        <p className="mt-2 text-xs text-muted-foreground">{fileName}</p>
      ) : null}
    </div>
  );
};
