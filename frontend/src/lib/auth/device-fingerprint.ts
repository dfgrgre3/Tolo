/**
 * Device fingerprint — a coarse, stable-per-browser identifier the backend can
 * use to flag sign-ins from an unrecognized device.
 *
 * SCOPE: this is a *risk signal*, not authentication. It is trivially spoofable
 * by anyone who controls the client, so it must never gate access on its own.
 *
 * The previous implementation hashed a canvas rendering of a fixed string with
 * a fixed font, which produced the same value for every user on the same
 * browser/OS build — no signal at all. This version mixes the attributes that
 * actually vary between devices, and is synchronous so the value is available
 * before the first submit rather than one render late.
 */

const FINGERPRINT_STORAGE_KEY = "tolo_device_fp";

/** FNV-1a — small, fast, no crypto dependency. Not a security hash. */
function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in range via Math.imul.
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 converts the signed 32-bit result to unsigned.
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Collects the device attributes that differ meaningfully between browsers. */
function collectSignals(): string {
  if (typeof window === "undefined") return "ssr";

  const nav = window.navigator;
  const screen = window.screen;

  const signals: (string | number | undefined)[] = [
    nav.userAgent,
    nav.language,
    Array.isArray(nav.languages) ? nav.languages.join(",") : undefined,
    nav.platform,
    nav.hardwareConcurrency,
    // Firefox and Safari omit deviceMemory entirely, which is itself a signal.
    (nav as Navigator & { deviceMemory?: number }).deviceMemory,
    nav.maxTouchPoints,
    screen?.width,
    screen?.height,
    screen?.colorDepth,
    screen?.pixelDepth,
    window.devicePixelRatio,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];

  return signals.filter((value) => value !== undefined && value !== null).join("|");
}

/**
 * Returns the fingerprint for this browser, computing it on first call and
 * caching it in localStorage so it survives reloads.
 *
 * Safe to call during render: returns `""` on the server and never throws
 * (private-mode browsers reject localStorage access).
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";

  try {
    const cached = window.localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (cached) return cached;
  } catch {
    // localStorage unavailable (private mode, blocked site data) — recompute.
  }

  const fingerprint = hashString(collectSignals());

  try {
    window.localStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprint);
  } catch {
    // Non-fatal: we still return a usable value for this page load.
  }

  return fingerprint;
}
