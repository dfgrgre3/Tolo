import { AnimatePresence, m } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCourseVideoPlayerStore } from "../store";
import { formatDuration } from "../utils";

export function PlayerOverlays({
  onAcceptResume,
  onDismissResume,
  onCancelAutoplay,
  onPlayNextNow,
  onRetry,
}: {
  onAcceptResume: () => void;
  onDismissResume: () => void;
  onCancelAutoplay: () => void;
  onPlayNextNow?: () => void;
  onRetry?: () => void;
}) {
  const {
    feedback,
    isLoading,
    errorMessage,
    resumeTime,
    isEnded,
    autoplayCountdown,
  } = useCourseVideoPlayerStore(
    useShallow((state) => ({
      feedback: state.feedback,
      isLoading: state.isLoading,
      errorMessage: state.errorMessage,
      resumeTime: state.resumeTime,
      isEnded: state.isEnded,
      autoplayCountdown: state.autoplayCountdown,
    }))
  );

  const setPlayerState = useCourseVideoPlayerStore((s) => s.setPlayerState);
  const autoplayProgress = ((5 - autoplayCountdown) / 5) * 100;

  return (
    <>
      <AnimatePresence>
        {feedback ? (
          <m.div
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
          >
            <div className="rounded-3xl border border-white/10 bg-black/65 px-5 py-4 text-center shadow-2xl backdrop-blur-xl">
              <feedback.icon className="mx-auto h-7 w-7 text-white" />
              <p className="mt-2 text-sm font-bold text-white">{feedback.label}</p>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading ? (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer ring */}
              <div className="absolute h-20 w-20 animate-spin rounded-full border-2 border-transparent border-t-blue-400/80" />
              {/* Middle ring (opposite direction) */}
              <div className="absolute h-14 w-14 animate-spin rounded-full border-2 border-transparent border-b-cyan-400/60" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              {/* Inner icon */}
              <div className="rounded-3xl border border-white/10 bg-black/60 p-4 shadow-xl backdrop-blur-xl">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {errorMessage ? (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute left-4 right-4 top-20 z-40 rounded-2xl border border-rose-400/20 bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-100 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-full p-1.5 text-rose-200 transition hover:bg-rose-500/30 hover:text-white"
                    aria-label="إعادة المحاولة"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPlayerState({ errorMessage: null })}
                  className="rounded-full p-1.5 text-rose-200 transition hover:bg-rose-500/30 hover:text-white"
                  aria-label="إغلاق رسالة الخطأ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {resumeTime !== null ? (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute left-4 right-4 top-24 z-40 rounded-[26px] border border-blue-400/20 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-2xl sm:left-auto sm:right-6 sm:w-[340px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white">استكمال المشاهدة</p>
                <p className="mt-1 text-xs leading-6 text-white/65">
                  آخر موضع محفوظ عند {formatDuration(resumeTime)}.
                </p>
              </div>
              <button
                type="button"
                onClick={onDismissResume}
                className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                aria-label="إغلاق اقتراح الاستكمال"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onAcceptResume}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600"
              >
                متابعة من هنا
              </button>
              <button
                type="button"
                onClick={onDismissResume}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                تجاهل
              </button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isEnded && onPlayNextNow ? (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-xl"
          >
            <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-slate-950/85 p-8 text-center shadow-2xl">
              {/* Circular progress ring */}
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center" aria-live="assertive" aria-atomic="true">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48" cy="48" r="42"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="48" cy="48" r="42"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    className="text-blue-400 transition-all duration-1000"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - autoplayProgress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-3xl font-black text-blue-200">
                  {autoplayCountdown}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-black text-white">
                الدرس التالي سيبدأ تلقائيًا
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/65">
                يمكنك الإلغاء أو الانتقال مباشرة الآن.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCancelAutoplay}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={onPlayNextNow}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600"
                >
                  تشغيل الآن
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

    </>
  );
}
