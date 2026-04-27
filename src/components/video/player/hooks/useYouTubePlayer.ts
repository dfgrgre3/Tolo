"use client";

import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";

import type { YouTubeRuntimePlayer, YouTubeNamespace } from "../types";

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
  playerRef?: MutableRefObject<YouTubeRuntimePlayer | null>;
  onReady?: (player: YouTubeRuntimePlayer, api: YouTubeNamespace) => void;
  onStateChange?: (state: number, player: YouTubeRuntimePlayer, api: YouTubeNamespace) => void;
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
  const internalPlayerRef = useRef<YouTubeRuntimePlayer | null>(null);
  const playerRef = externalPlayerRef ?? internalPlayerRef;
  const isReadyRef = useRef(false);

  // 1. Initialization Effect
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
              if (isCancelled) return;
              const player = playerRef.current;
              if (!player) return;
              
              isReadyRef.current = true;
              
              // Apply initial state
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
      isReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      if (containerNode) {
        containerNode.innerHTML = "";
      }
    };
  }, [containerRef, enabled, videoId]); // Reduced dependencies to avoid re-creation

  // 2. Volume/Mute Updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;

    player.setVolume(Math.round(volume * 100));
    if (isMuted) {
      player.mute();
    } else {
      player.unMute();
    }
  }, [isMuted, volume]);

  // 3. Playback Rate Updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;

    const availableRates = player.getAvailablePlaybackRates();
    if (availableRates.includes(playbackRate)) {
      player.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  return playerRef;
}
