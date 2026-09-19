import { useCallback, useRef, type MutableRefObject } from "react";
import type { YouTubeRuntimePlayer, VideoProvider } from "../types";

export type BufferedRange = { start: number; end: number };

export type LoopRange = { start: number; end: number };

export type PlayerAdapter = {
  canUsePip: boolean;
  getBuffered: () => number;
  /** Full buffered ranges (P2-33) — the scalar getBuffered is last-end sugar. */
  getBufferedRanges: () => BufferedRange[];
  getCurrentTime: () => number;
  getDuration: () => number;
  pause: () => void;
  play: () => Promise<void>;
  /** Engine-owned play toggle (P2-33) — reads live engine state, not the store. */
  togglePlay: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  /**
   * Engine read-back (P2-42): the rate the MEDIA actually runs at — the only
   * value the store may mirror. Commands store the read-back, never the wish.
   */
  getPlaybackRate: () => number;
  setVolume: (volume: number) => void;
  // ── A-B loop is engine-owned (P1-17) ──────────────────────────
  // The adapter holds the range; the per-frame sync loop enforces it for
  // EVERY provider (HTML5 seek and YouTube seekTo alike). Precision comes
  // from the rAF loop, not from 4Hz timeupdate events. The zustand
  // loopStart/loopEnd fields are a DISPLAY mirror only (timeline region,
  // button state) — enforcement never reads them.
  setLoopRange: (start: number, end: number) => void;
  getLoopRange: () => LoopRange | null;
  clearLoop: () => void;
  /**
   * Release engine resources on unmount (P2-33). HTML5: stop + detach the
   * source so the element releases its decoder. YouTube: pause only — the
   * IFrame lifecycle belongs to useYouTubePlayer, never the adapter.
   */
  destroy: () => void;
};

type PlayerAdapterOptions = {
  provider: VideoProvider;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  youtubePlayerRuntimeRef: MutableRefObject<YouTubeRuntimePlayer | null>;
};

export function usePlayerAdapter({
  provider,
  videoRef,
  youtubePlayerRuntimeRef,
}: PlayerAdapterOptions) {
  // Engine-owned loop state: lives here (not in the store) so it survives
  // adapter object recreation and stays provider-agnostic.
  const loopRef = useRef<LoopRange | null>(null);

  const setLoopRange = useCallback((start: number, end: number) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) return;
    // end <= start is the "A set, waiting for B" pending state — stored but
    // never enforced until B lands past A.
    loopRef.current = { start, end };
  }, []);

  const getLoopRange = useCallback((): LoopRange | null => loopRef.current, []);

  const clearLoop = useCallback(() => {
    loopRef.current = null;
  }, []);

  const loopControls = { setLoopRange, getLoopRange, clearLoop };

  return useCallback((): PlayerAdapter | null => {
    if (provider === "youtube") {
      const player = youtubePlayerRuntimeRef.current;
      if (!player) return null;

      return {
        ...loopControls,
        canUsePip: false,
        getBuffered: () => 0,
        getBufferedRanges: () => [],
        getCurrentTime: () => player.getCurrentTime() || 0,
        getDuration: () => player.getDuration() || 0,
        pause: () => player.pauseVideo(),
        play: async () => {
          player.playVideo();
        },
        togglePlay: async () => {
          // IFrame states are stable public constants: 1 = playing.
          // Anything else (paused/ended/cued/buffering/unknown) → play.
          const state = player.getPlayerState?.();
          if (state === 1) player.pauseVideo();
          else player.playVideo();
        },
        seekTo: (seconds) => player.seekTo(seconds, true),
        setMuted: (muted) => {
          if (muted) {
            player.mute();
          } else {
            player.unMute();
          }
        },
        setPlaybackRate: (rate) => {
          player.setPlaybackRate(rate);
        },
        getPlaybackRate: () => player.getPlaybackRate?.() ?? Number.NaN,
        setVolume: (nextVolume) => {
          player.setVolume(Math.round(nextVolume * 100));
        },
        destroy: () => {
          player.pauseVideo();
        },
      };
    }

    const video = videoRef.current;
    if (!video) return null;

    return {
      ...loopControls,
      canUsePip:
        Boolean(document.pictureInPictureEnabled) &&
        typeof video.requestPictureInPicture === "function",
      getBuffered: () =>
        video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
      getBufferedRanges: () =>
        Array.from({ length: video.buffered.length }, (_, i) => ({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        })),
      getCurrentTime: () => video.currentTime || 0,
      getDuration: () => video.duration || 0,
      pause: () => video.pause(),
      play: () => Promise.resolve(video.play()),
      togglePlay: () => {
        if (video.paused || video.ended) return Promise.resolve(video.play());
        video.pause();
        return Promise.resolve();
      },
      seekTo: (seconds) => {
        video.currentTime = seconds;
      },
      setMuted: (muted) => {
        video.muted = muted;
      },
      setPlaybackRate: (rate) => {
        video.playbackRate = rate;
      },
      getPlaybackRate: () => video.playbackRate,
      setVolume: (nextVolume) => {
        video.volume = nextVolume;
      },
      destroy: () => {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch {
          // Teardown best-effort: never throw from unmount paths.
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loopControls are stable useCallbacks
  }, [provider, videoRef, youtubePlayerRuntimeRef]);
}
