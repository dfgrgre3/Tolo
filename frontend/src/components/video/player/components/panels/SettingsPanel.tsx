import { AnimatePresence, m } from "framer-motion";
import {
  ChevronRight,
  Keyboard,
  Layers,
  Sparkles,
  SunMedium,
  Settings2,
  Zap,
  Monitor,
  Type,
  Maximize2,
  ChevronLeft,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, type ComponentType } from "react";
import type { QualityOption, SubtitleTrack } from "../../types";
import { useSettingsStore } from "../../stores/settings-store";
import { Check } from "lucide-react";

// Shared row shell used by every settings entry — keeps the gradient/hover/
// active styling in one place instead of duplicated per-setting.
function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  isToggle = false,
  isActive = false,
  iconGradient = "from-emerald-500/20 to-teal-500/20",
  iconRing = "ring-emerald-500/20 group-hover:ring-emerald-500/40",
  iconColor = "text-emerald-300",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick: () => void;
  isToggle?: boolean;
  isActive?: boolean;
  iconGradient?: string;
  iconRing?: string;
  iconColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] px-5 py-4.5 text-sm font-bold text-white/90 transition-all duration-300 hover:from-white/10 hover:to-white/5 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:scale-[1.02] active:scale-[0.98] border border-white/5 hover:border-white/10 sm:py-4"
    >
      <span className="flex items-center gap-3">
        <div className={cn("rounded-xl bg-gradient-to-br p-2 ring-1 transition-all", iconGradient, iconRing)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <span className="text-white/90 group-hover:text-white transition-colors">{label}</span>
      </span>
      {isToggle ? (
        isActive ? <ToggleRight className="h-6 w-6 text-emerald-400" /> : <ToggleLeft className="h-6 w-6 text-white/40" />
      ) : (
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/70 group-hover:bg-white/10 group-hover:text-white transition-all">{value}</span>
          <ChevronLeft className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
        </div>
      )}
    </button>
  );
}

function QualitySettings({
  qualities,
  allowAutoQuality,
  selectedQuality,
  onChangeQuality,
}: {
  qualities: QualityOption[];
  allowAutoQuality: boolean;
  selectedQuality: number;
  onChangeQuality: (id: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (qualities.length === 0) return null;
  const currentLabel = selectedQuality === -1 ? "تلقائي" : qualities.find((q) => q.id === selectedQuality)?.label || "يدوي";

  return (
    <div className="space-y-2">
      <SettingsRow
        icon={Monitor}
        label="الجودة"
        value={currentLabel}
        onClick={() => setIsOpen((open) => !open)}
        iconGradient="from-blue-500/20 to-cyan-500/20"
        iconRing="ring-blue-500/20 group-hover:ring-blue-500/40"
        iconColor="text-blue-300"
      />
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 p-2">
              {allowAutoQuality && (
                <button
                  type="button"
                  onClick={() => { onChangeQuality(-1); setIsOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                    selectedQuality === -1 ? "bg-blue-500/20 text-blue-100" : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span>تلقائي</span>
                  {selectedQuality === -1 && <Check className="h-4 w-4" />}
                </button>
              )}
              {qualities.map((quality) => (
                <button
                  key={quality.id}
                  type="button"
                  onClick={() => { onChangeQuality(quality.id); setIsOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                    selectedQuality === quality.id ? "bg-blue-500/20 text-blue-100" : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span>{quality.label}</span>
                  {selectedQuality === quality.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpeedSettings({
  playbackRates,
  playbackRate,
  onChangePlaybackRate,
}: {
  playbackRates: number[];
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
}) {
  return (
    <SettingsRow
      icon={Zap}
      label="سرعة التشغيل"
      value={`${playbackRate}x`}
      onClick={() => {
        const currentIndex = playbackRates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % playbackRates.length;
        const nextRate = playbackRates[nextIndex];
        if (nextRate !== undefined) onChangePlaybackRate(nextRate);
      }}
      iconGradient="from-amber-500/20 to-orange-500/20"
      iconRing="ring-amber-500/20 group-hover:ring-amber-500/40"
      iconColor="text-amber-300"
    />
  );
}

function SubtitleSettings({
  subtitleTracks,
  selectedSubtitle,
  onChangeSubtitle,
}: {
  subtitleTracks: SubtitleTrack[];
  selectedSubtitle: string;
  onChangeSubtitle: (id: string) => void;
}) {
  if (subtitleTracks.length === 0) return null;
  const currentLabel = selectedSubtitle === "off" ? "بدون ترجمة" : subtitleTracks.find((t) => t.id === selectedSubtitle)?.label || "بدون ترجمة";
  return (
    <SettingsRow
      icon={Type}
      label="الترجمة"
      value={currentLabel}
      onClick={() => {
        if (selectedSubtitle === "off" && subtitleTracks[0]) {
          onChangeSubtitle(subtitleTracks[0].id);
        } else {
          onChangeSubtitle("off");
        }
      }}
      iconGradient="from-purple-500/20 to-pink-500/20"
      iconRing="ring-purple-500/20 group-hover:ring-purple-500/40"
      iconColor="text-purple-300"
    />
  );
}

interface SettingsPanelProps {
  isSettingsOpen: boolean;
  isEfficiencyMode?: boolean;
  qualities: QualityOption[];
  allowAutoQuality: boolean;
  selectedQuality: number;
  onChangeQuality: (id: number) => void;
  playbackRates: number[];
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  subtitleTracks: SubtitleTrack[];
  selectedSubtitle: string;
  onChangeSubtitle: (id: string) => void;
  brightness: number;
  onChangeBrightness: (value: number) => void;
  isAmbientMode: boolean;
  onToggleAmbient: () => void;
  onOpenStats: () => void;
  onCloseSettings: () => void;
  shortcuts: [string, string][];
  isShortcutsOpen: boolean;
  onToggleShortcuts: () => void;
}

export function SettingsPanel({
  isSettingsOpen, qualities, allowAutoQuality, selectedQuality, onChangeQuality,
  playbackRates, playbackRate, onChangePlaybackRate, subtitleTracks, selectedSubtitle, onChangeSubtitle,
  brightness, onChangeBrightness, isAmbientMode, onToggleAmbient, onOpenStats,
  onCloseSettings, shortcuts, isShortcutsOpen, onToggleShortcuts,
}: SettingsPanelProps) {
  const { zoomFactor, subtitleSize, subtitleBgOpacity, setSettingsState } = useSettingsStore();

  // Mobile: full-screen slide-up panel
  const isMobilePanel = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <AnimatePresence>
      {isSettingsOpen ? (
        <m.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed inset-0 z-[100] flex items-end sm:absolute sm:bottom-28 sm:right-5 sm:w-[360px] sm:max-h-[70vh] sm:items-start",
            isMobilePanel ? "bg-slate-950" : "pointer-events-none"
          )}
        >
          <div 
            className={cn(
              "w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-950 p-6 pb-10 shadow-2xl",
              "sm:max-h-[70vh] sm:rounded-[28px] sm:border sm:border-white/10 sm:bg-slate-950/95 sm:p-6 sm:pb-6 sm:backdrop-blur-2xl",
              !isMobilePanel && "sm:pointer-events-auto",
              "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            )}
            onClick={isMobilePanel ? undefined : (e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-white sm:text-base bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">إعدادات التشغيل</p>
                <p className="text-xs text-white/50 sm:text-[11px]">تخصيص تجربة المشاهدة</p>
              </div>
              <button 
                type="button" 
                onClick={onCloseSettings}
                className="rounded-full bg-white/5 p-2.5 text-white/60 transition-all hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 sm:p-2 ring-1 ring-white/10 hover:ring-white/20" 
                aria-label="إغلاق الإعدادات"
              >
                <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            </div>
            
            {/* Mobile: Scroll indicator */}
            {isMobilePanel && (
              <div className="mb-5 flex items-center justify-center gap-2 text-[10px] text-white/30">
                <div className="h-1 w-1 rounded-full bg-white/30" />
                <span>اسحب للمزيد</span>
                <div className="h-1 w-1 rounded-full bg-white/30" />
              </div>
            )}
            
            <div className="space-y-5">
              {/* Video Settings Group */}
              <div className="space-y-4">
                <p className="px-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">إعدادات الفيديو</p>
                <QualitySettings qualities={qualities} allowAutoQuality={allowAutoQuality} selectedQuality={selectedQuality} onChangeQuality={onChangeQuality} />
                <SpeedSettings playbackRates={playbackRates} playbackRate={playbackRate} onChangePlaybackRate={onChangePlaybackRate} />
                <SubtitleSettings subtitleTracks={subtitleTracks} selectedSubtitle={selectedSubtitle} onChangeSubtitle={onChangeSubtitle} />
              </div>
              
              {/* Playback Settings Group */}
              <div className="space-y-4">
                <p className="px-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">إعدادات التشغيل</p>
                <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] px-5 py-5 border border-white/5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-3 text-sm font-bold text-white/90">
                      <div className="rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 p-2 ring-1 ring-sky-500/20">
                        <Settings2 className="h-4 w-4 text-sky-300" />
                      </div>
                      سرعة مخصصة
                    </span>
                    <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-200 ring-1 ring-sky-500/30">{playbackRate.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min={0.5} 
                    max={3.0} 
                    step={0.05} 
                    value={playbackRate}
                    onChange={(event) => onChangePlaybackRate(Number(event.target.value))}
                    aria-label="السرعة المخصصة" 
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-sky-500 transition-all duration-300 hover:bg-white/30 hover:shadow-[0_0_10px_rgba(14,165,233,0.3)]" 
                  />
                </div>

                {/* Subtitle custom styling */}
                {subtitleTracks.length > 0 && selectedSubtitle !== "off" && (
                  <div className="space-y-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] p-5 border border-white/5">
                    <div>
                      <div className="mb-3 flex items-center justify-between text-sm font-bold text-white/90">
                        <span className="flex items-center gap-2">
                          <div className="rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 p-1.5 ring-1 ring-violet-500/20">
                            <Type className="h-3.5 w-3.5 text-violet-300" />
                          </div>
                          حجم الخط
                        </span>
                        <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-500/30">{subtitleSize.toUpperCase()}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {(["sm", "md", "lg", "xl"] as const).map((size) => (
                          <button 
                            key={size} 
                            type="button" 
                            onClick={() => setSettingsState({ subtitleSize: size })}
                            className={cn("rounded-xl py-2.5 text-xs font-bold transition-all duration-300",
                              subtitleSize === size 
                                ? "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:scale-105" 
                                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 hover:scale-105")}>
                            {size.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center justify-between text-sm font-bold text-white/90">
                        <span>خلفية الترجمة</span>
                        <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70">{Math.round(subtitleBgOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={1.0} 
                        step={0.1} 
                        value={subtitleBgOpacity}
                        onChange={(event) => setSettingsState({ subtitleBgOpacity: Number(event.target.value) })}
                        aria-label="خلفية الترجمة" 
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-violet-500 transition-all duration-300 hover:bg-white/30 hover:shadow-[0_0_10px_rgba(139,92,246,0.3)]" 
                      />
                    </div>
                  </div>
                )}

              {/* Display Settings Group */}
              <div className="space-y-4">
                <p className="px-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">إعدادات العرض</p>
                <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] px-5 py-5 border border-white/5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-3 text-sm font-bold text-white/90">
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 p-2 ring-1 ring-emerald-500/20">
                        <Maximize2 className="h-4 w-4 text-emerald-300" />
                      </div>
                      تقريب الفيديو (Zoom)
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30">{zoomFactor.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min={1.0} 
                    max={3.0} 
                    step={0.1} 
                    value={zoomFactor}
                    onChange={(event) => {
                      const factor = Number(event.target.value);
                      setSettingsState({ 
                        zoomFactor: factor, 
                        panOffset: factor === 1.0 ? { x: 0, y: 0 } : useSettingsStore.getState().panOffset 
                      });
                    }}
                    aria-label="تكبير الفيديو" 
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-emerald-500 transition-all duration-300 hover:bg-white/30 hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                  />
                  {zoomFactor > 1 && (
                    <p className="mt-3 text-xs text-white/50 flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      اسحب الفيديو للتحرك، أو اضغط مرتين للرستة
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] px-5 py-5 border border-white/5">
		          <div className="mb-4 flex items-center justify-between">
		            <span className="flex items-center gap-3 text-sm font-bold text-white/90">
		              <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 p-2 ring-1 ring-amber-500/20">
		                <SunMedium className="h-4 w-4 text-amber-300" />
		              </div>
		              السطوع
		            </span>
		            <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/30">{Math.round(brightness * 100)}%</span>
		          </div>
		          <input 
		            type="range" 
		            min={0.6} 
		            max={1.3} 
		            step={0.05} 
		            value={brightness}
		            onChange={(event) => onChangeBrightness(Number(event.target.value))}
		            aria-label="السطوع" 
		            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-amber-500 transition-all duration-300 hover:bg-white/30 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
		          />
		        </div>
              </div>

              {/* Tools & Features Group */}
              <div className="space-y-4">
                <p className="px-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">أدوات ومميزات</p>
                <SettingsRow icon={Sparkles} label="الإضاءة المحيطية" value={isAmbientMode ? "مفعلة" : "متوقفة"} onClick={onToggleAmbient} />
                <SettingsRow icon={Layers} label="إحصاءات المشغل" value="عرض" onClick={onOpenStats} />
                <SettingsRow icon={Keyboard} label="اختصارات لوحة المفاتيح" value="عرض" onClick={onToggleShortcuts} />
              </div>
            </div>
          </div>
        </div>

          {/* Keyboard Shortcuts Popup */}
          <AnimatePresence>
            {isShortcutsOpen && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                onClick={onToggleShortcuts}
              >
                <m.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 25,
                    duration: 0.3
                  }}
                  className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 to-slate-900 p-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 ring-1 ring-blue-500/30">
                        <Keyboard className="h-6 w-6 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white">اختصارات لوحة المفاتيح</p>
                        <p className="text-xs text-white/50">اضغط داخل المشغل أولًا ثم استخدم الاختصارات</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={onToggleShortcuts}
                      className="rounded-full bg-white/5 p-2.5 text-white/50 transition-all hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
                      aria-label="إغلاق"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {shortcuts.map(([shortcut, description], index) => (
                        <m.div
                          key={shortcut}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 to-transparent px-4 py-3.5 transition-all hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]"
                        >
                          <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{description}</span>
                          <kbd className="rounded-xl border border-white/20 bg-gradient-to-br from-black/50 to-black/70 px-3 py-1.5 text-xs font-black text-blue-300 shadow-lg ring-1 ring-white/10 group-hover:ring-blue-500/30 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">{shortcut}</kbd>
                        </m.div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-white/40 text-center">
                      💡 نصيحة: استخدم هذه الاختصارات للتحكم السريع في المشغل
                    </p>
                  </div>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
          
          {/* Mobile: Close handle bar */}
          {isMobilePanel && (
            <div className="absolute left-0 right-0 top-2 flex justify-center sm:hidden">
              <div className="h-1 w-12 rounded-full bg-white/20" />
            </div>
          )}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}