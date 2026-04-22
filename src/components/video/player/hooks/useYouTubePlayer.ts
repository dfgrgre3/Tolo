"use client";

import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";

type YouTubePlayer = {
  destroy: () => void;
  getAvailablePlaybackRates: () => number[];
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setPlaybackRate: (playbackRate: number) => void;
  setVolume: (volume: number) => void;
  unMute: () => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    config: {
      videoId: string;
      playerVars: Record<string, number>;
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is unavailable on the server."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube API."));
      document.body.appendChild(script);
    }

    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube API did not initialize."));
      }
    };
  });

  return youtubeApiPromise;
}

type UseYouTubePlayerOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  videoId: string | null;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  playerRef?: MutableRefObject<YouTubePlayer | null>;
  onReady?: (player: YouTubePlayer, api: YouTubeNamespace) => void;
  onStateChange?: (state: number, player: YouTubePlayer, api: YouTubeNamespace) => void;
  onError?: () => void;
};

export function useYouTubePlayer({
  containerRef,
  enabled,
  videoId,
  volume,
  isMuted,
  playbackRate,
  playerRef: externalPlayerRef,
  onReady,
  onStateChange,
  onError,
}: UseYouTubePlayerOptions) {
  const internalPlayerRef = useRef<YouTubePlayer | null>(null);
  const playerRef = externalPlayerRef ?? internalPlayerRef;

  useEffect(() => {
    if (!enabled || !videoId || !containerRef.current) {
      return;
    }

    let isCancelled = false;
    const containerNode = containerRef.current;

    void loadYouTubeApi()
      .then((api) => {
        if (isCancelled || !containerNode) {
          return;
        }

        playerRef.current = new api.Player(containerNode, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              const player = playerRef.current;
              if (!player) return;
              player.setVolume(Math.round(volume * 100));
              if (isMuted) {
                player.mute();
              } else {
                player.unMute();
              }

              const availableRates = player.getAvailablePlaybackRates();
              if (availableRates.includes(playbackRate)) {
                player.setPlaybackRate(playbackRate);
              }

              onReady?.(player, api);
            },
            onStateChange: (event) => {
              const player = playerRef.current;
              if (!player) return;
              onStateChange?.(event.data, player, api);
            },
            onError: () => {
              onError?.();
            },
          },
        });
      })
      .catch(() => {
        onError?.();
      });

    return () => {
      isCancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      if (containerNode) {
        containerNode.innerHTML = "";
      }
    };
  }, [
    containerRef,
    enabled,
    isMuted,
    onError,
    onReady,
    onStateChange,
    playerRef,
    playbackRate,
    videoId,
    volume,
  ]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.setVolume(Math.round(volume * 100));
    if (isMuted) {
      player.mute();
    } else {
      player.unMute();
    }
  }, [isMuted, playerRef, volume]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const availableRates = player.getAvailablePlaybackRates();
    if (availableRates.includes(playbackRate)) {
      player.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, playerRef]);

  return playerRef;
}
