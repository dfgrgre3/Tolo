/**
 * Browser capability detection (P2-39).
 *
 * The compatibility matrix (Chrome/Edge/Firefox/Safari/iOS/Android/Samsung)
 * can't be executed from this repo, so every capability-gated feature reads
 * ONE runtime probe instead of user-agent sniffing:
 *
 *   PiP / fullscreen / AirPlay / MediaSession / MSE-HLS / touch / Cast
 *
 * Probes run client-side only (SSR-safe: all false on the server) and are
 * memoized per page load — media capabilities don't change at runtime
 * except through permissions, which are handled at call time, not here.
 */

export interface PlayerCapabilities {
  /** MSE available for hls.js (false → native HLS or progressive only). */
  mseHls: boolean;
  /** Native HLS (Safari / iOS). */
  nativeHls: boolean;
  pictureInPicture: boolean;
  fullscreen: boolean;
  airplay: boolean;
  mediaSession: boolean;
  touch: boolean;
  castSdk: boolean;
}

let cached: PlayerCapabilities | null = null;

function probeVideo(): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  try {
    return document.createElement("video");
  } catch {
    return null;
  }
}

export function getPlayerCapabilities(): PlayerCapabilities {
  if (cached) return cached;
  const fallback: PlayerCapabilities = {
    mseHls: false,
    nativeHls: false,
    pictureInPicture: false,
    fullscreen: false,
    airplay: false,
    mediaSession: false,
    touch: false,
    castSdk: false,
  };
  if (typeof window === "undefined") {
    return fallback;
  }

  const video = probeVideo();
  const canPlayHls = video
    ? video.canPlayType("application/vnd.apple.mpegurl") !== ""
    : false;

  cached = {
    mseHls:
      typeof window.MediaSource !== "undefined" &&
      typeof window.MediaSource.isTypeSupported === "function" &&
      window.MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'),
    nativeHls: canPlayHls,
    pictureInPicture:
      typeof document !== "undefined" &&
      (document as Document & { pictureInPictureEnabled?: boolean })
        .pictureInPictureEnabled === true &&
      typeof (video as (HTMLVideoElement & { requestPictureInPicture?: unknown }) | null)
        ?.requestPictureInPicture === "function",
    fullscreen:
      typeof document !== "undefined" &&
      (document as Document & { fullscreenEnabled?: boolean }).fullscreenEnabled !== false &&
      typeof document.documentElement?.requestFullscreen === "function",
    airplay:
      typeof (window as { WebKitPlaybackTargetAvailabilityEvent?: unknown })
        .WebKitPlaybackTargetAvailabilityEvent !== "undefined",
    mediaSession:
      typeof window.navigator !== "undefined" && "mediaSession" in window.navigator,
    touch:
      (typeof window.navigator !== "undefined" && window.navigator.maxTouchPoints > 0) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches),
    castSdk:
      typeof (window as { cast?: { framework?: unknown } }).cast?.framework !== "undefined" ||
      typeof (window as { chrome?: { cast?: unknown } }).chrome?.cast !== "undefined",
  };
  return cached;
}

/** Test seam: reset the memoized probe. */
export function resetPlayerCapabilities() {
  cached = null;
}
