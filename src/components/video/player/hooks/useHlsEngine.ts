import { useEffect, useRef, useCallback, type MutableRefObject } from "react";
import Hls from "hls.js";
import { Sparkles } from "lucide-react";
import { useCourseVideoPlayerStore } from "../store";
import { shouldUseHls } from "../utils";
import type { PlayerFeedback, VideoProvider } from "../types";

type HlsEngineOptions = {
  activeVideoUrl: string;
  provider: VideoProvider;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
};

export function useHlsEngine({
  activeVideoUrl,
  provider,
  videoRef,
  flashFeedback,
}: HlsEngineOptions) {
  const { setPlayerState } = useCourseVideoPlayerStore();
  const hlsRef = useRef<Hls | null>(null);
  const hlsRetryTimeoutRef = useRef<number | null>(null);
  const hlsRetryStateRef = useRef({ network: 0, media: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || provider === "youtube") return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (hlsRetryTimeoutRef.current) {
      clearTimeout(hlsRetryTimeoutRef.current);
    }
    hlsRetryStateRef.current = { network: 0, media: 0 };

    if (!shouldUseHls(activeVideoUrl, provider)) {
      video.src = activeVideoUrl;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeVideoUrl;
      return;
    }

    if (!Hls.isSupported()) {
      video.src = activeVideoUrl;
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      capLevelToPlayerSize: true,
      backBufferLength: 90,
    });

    hlsRef.current = hls;
    hls.loadSource(activeVideoUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const nextQualities = hls.levels
        .map((level, index) => ({
          id: index,
          height: level.height,
          label: level.height > 0 ? `${level.height}p` : `L${index + 1}`,
        }))
        .filter((level, index, array) => {
          return array.findIndex((item) => item.height === level.height) === index;
        })
        .sort((left, right) => right.height - left.height);

      setPlayerState({
        qualities: nextQualities,
        currentAutoQuality: hls.levels[hls.currentLevel]?.height ?? null,
        isLoading: false,
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      setPlayerState({
        currentAutoQuality: hls.levels[data.level]?.height ?? null,
      });
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;

      const retryState = hlsRetryStateRef.current;
      const lowerQuality = () => {
        if (hls.currentLevel > 0) {
          hls.currentLevel = hls.currentLevel - 1;
          setPlayerState({ selectedQuality: hls.currentLevel });
        }
      };

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        retryState.network += 1;
        lowerQuality();
        if (retryState.network <= 4) {
          hlsRetryTimeoutRef.current = window.setTimeout(() => {
            hls.startLoad();
          }, Math.min(1200 * retryState.network, 5000));
          flashFeedback({
            icon: Sparkles,
            label: "نعيد محاولة الاتصال بجودة أقل...",
          });
          return;
        }
      }

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        retryState.media += 1;
        if (retryState.media <= 2) {
          lowerQuality();
          hls.recoverMediaError();
          flashFeedback({
            icon: Sparkles,
            label: "جارٍ استعادة البث...",
          });
          return;
        }
      }

      hls.destroy();
      setPlayerState({
        errorMessage: "تعذر تشغيل البث الحالي بعد عدة محاولات.",
        isLoading: false,
      });
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
      if (hlsRetryTimeoutRef.current) {
        clearTimeout(hlsRetryTimeoutRef.current);
      }
    };
  }, [activeVideoUrl, flashFeedback, provider, setPlayerState, videoRef]);

  return hlsRef;
}
