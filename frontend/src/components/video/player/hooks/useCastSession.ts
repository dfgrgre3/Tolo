import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Chromecast integration via Google's Cast SDK.
 *
 * The SDK script is loaded lazily (only once a video that supports casting is
 * present) instead of globally in the app layout — most pages never show a
 * video player, so there's no reason to ship this on every route.
 *
 * Casting only makes sense for a publicly reachable HLS stream: the Cast
 * receiver device fetches the URL itself over the network, so `localhost`/
 * dev-mode sources and non-HLS (mp4 progressive/YouTube) sources are not
 * offered — `canCast` reflects that gate.
 */

// Minimal shape of the `cast.framework` API surface we actually use — the
// full typings ship only via the externally-loaded SDK, which isn't
// available at compile time.
interface CastSession {
  loadMedia: (request: unknown) => Promise<void>;
  endSession: (stopCasting: boolean) => void;
}
interface CastContext {
  setOptions: (options: Record<string, unknown>) => void;
  requestSession: () => Promise<void>;
  getCurrentSession: () => CastSession | null;
  addEventListener: (type: string, handler: () => void) => void;
}
interface CastWindow extends Window {
  chrome?: { cast?: { AutoJoinPolicy?: { ORIGIN_SCOPED?: string }; media?: { DEFAULT_MEDIA_RECEIVER_APP_ID?: string; MediaInfo?: new (url: string, contentType: string) => unknown; LoadRequest?: new (mediaInfo: unknown) => { metadata?: unknown }; GenericMediaMetadata?: new () => { title?: string } } } };
  cast?: { framework?: { CastContext: { getInstance: () => CastContext }; CastContextEventType: { SESSION_STATE_CHANGED: string }; SessionState: { SESSION_STARTED: string; SESSION_ENDED: string } } };
  __onGCastApiAvailable?: (isAvailable: boolean) => void;
}

const CAST_SDK_URL =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

let sdkLoadPromise: Promise<void> | null = null;

function loadCastSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const win = window as CastWindow;
    if (win.cast?.framework) {
      resolve();
      return;
    }

    win.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) resolve();
      else reject(new Error("Cast SDK reported unavailable"));
    };

    const script = document.createElement("script");
    script.src = CAST_SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Cast SDK"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function isPubliclyReachableHlsUrl(url: string): boolean {
  if (!url.includes(".m3u8")) return false;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

export function useCastSession({
  videoUrl,
  title,
  getCurrentTime,
}: {
  videoUrl: string;
  title: string;
  getCurrentTime: () => number;
}) {
  const [isCasting, setIsCasting] = useState(false);
  const contextRef = useRef<CastContext | null>(null);

  const canCast =
    typeof window !== "undefined" && isPubliclyReachableHlsUrl(videoUrl);

  useEffect(() => {
    if (!canCast) return;
    let cancelled = false;

    loadCastSdk()
      .then(() => {
        if (cancelled) return;
        const win = window as CastWindow;
        const framework = win.cast?.framework;
        const castNamespace = win.chrome?.cast;
        if (!framework || !castNamespace) return;

        const context = framework.CastContext.getInstance();
        context.setOptions({
          receiverApplicationId: castNamespace.media?.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: castNamespace.AutoJoinPolicy?.ORIGIN_SCOPED,
        });
        contextRef.current = context;

        context.addEventListener(framework.CastContextEventType.SESSION_STATE_CHANGED, () => {
          const session = context.getCurrentSession();
          setIsCasting(Boolean(session));
        });
      })
      .catch(() => {
        // Silently unavailable (offline, blocked, unsupported browser) — the
        // Cast button simply won't be shown; nothing else in the player depends on it.
      });

    return () => {
      cancelled = true;
    };
  }, [canCast]);

  const startCasting = useCallback(async () => {
    const win = window as CastWindow;
    const context = contextRef.current;
    const castNamespace = win.chrome?.cast;
    if (!context || !castNamespace?.media?.MediaInfo || !castNamespace.media.LoadRequest) return;

    await context.requestSession();
    const session = context.getCurrentSession();
    if (!session) return;

    const mediaInfo = new castNamespace.media.MediaInfo(videoUrl, "application/x-mpegurl");
    const request = new castNamespace.media.LoadRequest(mediaInfo);
    if (castNamespace.media.GenericMediaMetadata) {
      const metadata = new castNamespace.media.GenericMediaMetadata();
      metadata.title = title;
      request.metadata = metadata;
    }
    await session.loadMedia(request);
    void getCurrentTime; // reserved for resuming playback position on the receiver
  }, [videoUrl, title, getCurrentTime]);

  const stopCasting = useCallback(() => {
    contextRef.current?.getCurrentSession()?.endSession(true);
  }, []);

  return { canCast, isCasting, startCasting, stopCasting };
}
