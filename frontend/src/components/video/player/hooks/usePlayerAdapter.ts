import { useCallback, type MutableRefObject } from "react";
import type { YouTubeRuntimePlayer, VideoProvider } from "../types";

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
  return useCallback((): PlayerAdapter | null => {
    if (provider === "youtube") {
      const player = youtubePlayerRuntimeRef.current;
      if (!player) return null;

      return {
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
      canUsePip:
        Boolean(document.pictureInPictureEnabled) &&
        typeof video.requestPictureInPicture === "function",
      getBuffered: () =>
        video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
      getCurrentTime: () => video.currentTime || 0,
      getDuration: () => video.duration || 0,
      pause: () => video.pause(),
      play: () => video.play(),
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
  }, [provider, videoRef, youtubePlayerRuntimeRef]);
}
