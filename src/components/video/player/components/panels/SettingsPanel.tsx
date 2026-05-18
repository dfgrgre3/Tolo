'use client';

import { AnimatePresence, m } from "framer-motion";
import {
  ChevronRight,
  Copy,
  Layers,
  RotateCcw,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualityOption, SubtitleTrack } from "../../types";

function QualitySettings({ qualities, allowAutoQuality, selectedQuality, onChangeQuality }: any) {
  if (qualities.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">الجودة</p>
      <div className="grid grid-cols-3 gap-2">
        {allowAutoQuality ? (
          <button type="button" onClick={() => onChangeQuality(-1)}
            className={cn("rounded-2xl px-3 py-2 text-xs font-bold transition",
              selectedQuality === -1 ? "bg-blue-500 text-white" : "bg-white/5 text-white/65 hover:bg-white/10")}>
            تلقائي
          </button>
        ) : null}
        {qualities.map((quality: any) => (
          <button key={quality.id} type="button" onClick={() => onChangeQuality(quality.id)}
            className={cn("rounded-2xl px-3 py-2 text-xs font-bold transition",
              selectedQuality === quality.id ? "bg-blue-500 text-white" : "bg-white/5 text-white/65 hover:bg-white/10")}>
            {quality.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpeedSettings({ playbackRates, playbackRate, onChangePlaybackRate }: any) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">السرعة</p>
      <div className="grid grid-cols-3 gap-2">
        {playbackRates.map((rate: any) => (
          <button key={rate} type="button" onClick={() => onChangePlaybackRate(rate)}
            className={cn("rounded-2xl px-3 py-2 text-xs font-bold transition",
              playbackRate === rate ? "bg-white text-slate-950" : "bg-white/5 text-white/65 hover:bg-white/10")}>
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );
}

function SubtitleSettings({ subtitleTracks, selectedSubtitle, onChangeSubtitle }: any) {
  if (subtitleTracks.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">الترجمة</p>
      <div className="space-y-2">
        <button type="button" onClick={() => onChangeSubtitle("off")}
          className={cn("flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold transition",
            selectedSubtitle === "off" ? "bg-white text-slate-950" : "bg-white/5 text-white/65 hover:bg-white/10")}>
          بدون ترجمة
        </button>
        {subtitleTracks.map((track: any) => (
          <button key={track.id} type="button" onClick={() => onChangeSubtitle(track.id)}
            className={cn("flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold transition",
              selectedSubtitle === track.id ? "bg-white text-slate-950" : "bg-white/5 text-white/65 hover:bg-white/10")}>
            <span>{track.label} <span className="mr-2 text-xs opacity-60">{track.language.toUpperCase()}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, value, onClick }: any) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-3 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10">
      <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
      <span>{value}</span>
    </button>
  );
}

export function SettingsPanel({
  isSettingsOpen, isEfficiencyMode, qualities, allowAutoQuality, selectedQuality, onChangeQuality,
  playbackRates, playbackRate, onChangePlaybackRate, subtitleTracks, selectedSubtitle, onChangeSubtitle,
  brightness, onChangeBrightness, isAmbientMode, onToggleAmbient, onRestartPlayback, onOpenStats,
  canCopyLink, onCopyLessonLink, onCloseSettings,
}: any) {
  return (
    <AnimatePresence>
      {isSettingsOpen ? (
        <m.div
          initial={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={isEfficiencyMode ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          transition={isEfficiencyMode ? { duration: 0 } : undefined}
          className={cn("absolute bottom-24 right-4 z-40 w-[320px] rounded-[28px] border border-white/10 bg-slate-950/90 p-4 shadow-2xl",
            !isEfficiencyMode && "backdrop-blur-2xl")}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-white">إعدادات التشغيل</p>
              <p className="text-xs text-white/50">سرعة وجودة وترجمة وأدوات إضافية</p>
            </div>
            <button type="button" onClick={onCloseSettings}
              className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="إغلاق الإعدادات">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <QualitySettings qualities={qualities} allowAutoQuality={allowAutoQuality} selectedQuality={selectedQuality} onChangeQuality={onChangeQuality} />
          <SpeedSettings playbackRates={playbackRates} playbackRate={playbackRate} onChangePlaybackRate={onChangePlaybackRate} />
          <SubtitleSettings subtitleTracks={subtitleTracks} selectedSubtitle={selectedSubtitle} onChangeSubtitle={onChangeSubtitle} />
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">السطوع</p>
            <div className="rounded-2xl bg-white/5 px-3 py-3">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-white/75">
                <span className="flex items-center gap-2"><SunMedium className="h-4 w-4" /> سطوع المشغل</span>
                <span>{Math.round(brightness * 100)}%</span>
              </div>
              <input type="range" min={0.6} max={1.3} step={0.05} value={brightness}
                onChange={(event) => onChangeBrightness(Number(event.target.value))}
                aria-label="السطوع" className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white" />
            </div>
          </div>
          <div className="space-y-2 border-t border-white/10 pt-4">
            <SettingsRow icon={Sparkles} label="الإضاءة المحيطية" value={isAmbientMode ? "مفعلة" : "متوقفة"} onClick={onToggleAmbient} />
            <SettingsRow icon={RotateCcw} label="إعادة التشغيل" value="0:00" onClick={onRestartPlayback} />
            <SettingsRow icon={Layers} label="إحصاءات المشغل" value="عرض" onClick={onOpenStats} />
            {canCopyLink ? <SettingsRow icon={Copy} label="نسخ رابط الدرس" value="نسخ" onClick={onCopyLessonLink} /> : null}
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
