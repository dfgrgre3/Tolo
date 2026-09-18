import { useCallback, useRef, type MutableRefObject } from "react";
import type { YouTubeRuntimePlayer, VideoProvider } from "../types";

export type LoopRange = { start: number; end: number };

type PlayerAdapter = {
  canUsePip: boolean;
  getBuffered: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  pause: () => void;
  play: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
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
        getCurrentTime: () => player.getCurrentTime() || 0,
        getDuration: () => player.getDuration() || 0,
        pause: () => player.pauseVideo(),
        play: async () => {
          player.playVideo();
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
        setVolume: (nextVolume) => {
          player.setVolume(Math.round(nextVolume * 100));
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
      getCurrentTime: () => video.currentTime || 0,
      getDuration: () => video.duration || 0,
      pause: () => video.pause(),
      play: () => Promise.resolve(video.play()),
      seekTo: (seconds) => {
        video.currentTime = seconds;
      },
      setMuted: (muted) => {
        video.muted = muted;
      },
      setPlaybackRate: (rate) => {
        video.playbackRate = rate;
      },
      setVolume: (nextVolume) => {
        video.volume = nextVolume;
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loopControls are stable useCallbacks
  }, [provider, videoRef, youtubePlayerRuntimeRef]);
}
