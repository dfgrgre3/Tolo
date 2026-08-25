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

  // Latest-value refs: keep volume/mute/rate and event callbacks accessible inside the
  // initialization effect without re-creating the player when they change.
  const latestMediaPropsRef = useRef({ volume, isMuted, playbackRate });
  useEffect(() => {
    latestMediaPropsRef.current = { volume, isMuted, playbackRate };
  }, [isMuted, playbackRate, volume]);

  const callbacksRef = useRef({ onReady, onStateChange, onError });
  useEffect(() => {
    callbacksRef.current = { onReady, onStateChange, onError };
  }, [onReady, onStateChange, onError]);

  // 1. Initialization Effect
  useEffect(() => {
    if (!enabled || !videoId || !containerRef.current) {
      return;
    }

    let isCancelled = false;
    const containerNode = containerRef.current;

    loadYouTubeApi()
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

              const { volume, isMuted, playbackRate } = latestMediaPropsRef.current;

              // Apply initial state
              player.setVolume(Math.round(volume * 100));
              if (isMuted) {
                player.mute();
              } else {
                player.unMute();
              }

              const availableRates = player.getAvailablePlaybackRates?.() ?? [];
              if (availableRates.includes(playbackRate)) {
                player.setPlaybackRate(playbackRate);
              }

              callbacksRef.current.onReady?.(player, api);
            },
            onStateChange: (event) => {
              const player = playerRef.current;
              if (!player) return;
              callbacksRef.current.onStateChange?.(event.data, player, api);
            },
            onError: () => {
              callbacksRef.current.onError?.();
            },
          },
        });
      })
      .catch(() => {
        callbacksRef.current.onError?.();
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
  }, [containerRef, enabled, playerRef, videoId]); // Reduced dependencies to are-creation

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
  }, [isMuted, playerRef, volume]);

  // 3. Playback Rate Updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;

    const availableRates = player.getAvailablePlaybackRates?.() ?? [];
    if (availableRates.includes(playbackRate)) {
      player.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, playerRef]);

  return playerRef;
}
