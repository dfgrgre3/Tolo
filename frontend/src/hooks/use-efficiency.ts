"use client";

import React, { useState, useEffect, createContext, useContext, useMemo } from "react";

/**
 * Effective performance modes (the user has no UI choice - all is auto-detected):
 *  - 'performance': full effects (high-end devices)
 *  - 'balanced':    some effects reduced (mid-range devices)
 *  - 'lite':        most effects disabled (low-end devices)
 *  - 'saver':       all heavy effects disabled (very slow / 2G)
 *  - 'ultra-lite':  ultra-light for very weak devices (2GB RAM, software GPU, low battery)
 */
export type PerformanceMode = "auto" | "performance" | "balanced" | "lite" | "saver" | "ultra-lite";

export type EffectivePerformanceMode = "performance" | "balanced" | "lite" | "saver" | "ultra-lite";

export interface DeviceSignals {
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  gpuType: "software" | "weak" | "hardware" | "none" | "unknown";
  gpuRenderer: string;
  cpuBenchMs: number;
  isMobile: boolean;
  isTablet: boolean;
  isLowEnd: boolean;
  isMidRange: boolean;
  isHighEnd: boolean;
  score: number;
  reducedData: boolean;
  reducedMotion: boolean;
  lowBattery: boolean;
  osName: string;
  browserName: string;
}

interface PerformanceCapabilities extends DeviceSignals {
  recommended: EffectivePerformanceMode;
}

function decideMode(s: DeviceSignals): EffectivePerformanceMode {
  // Ultra-lite: save-data, 2g/slow-2g, software GPU, very low score, or low battery
  if (s.saveData) return "ultra-lite";
  if (s.effectiveType === "slow-2g" || s.effectiveType === "2g") return "ultra-lite";
  if (s.gpuType === "software" || s.gpuType === "none") return "ultra-lite";
  if (s.lowBattery) return "ultra-lite";
  if (s.score < 20) return "ultra-lite";
  if (s.score < 35) return "saver";
  if (s.score < 50) return "lite";
  if (s.score < 75) return "balanced";
  return "performance";
}

/**
 * Read device signals previously persisted by perf-detect.js (or default).
 */
function readPersistedSignals(): DeviceSignals | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("tolo-device-signals");
    if (!raw) return null;
    return JSON.parse(raw) as DeviceSignals;
  } catch {
    return null;
  }
}

/**
 * Detect device capabilities (used as a fallback if perf-detect.js didn't run).
 */
function detectCapabilities(): PerformanceCapabilities {
  if (typeof navigator === "undefined") {
    return {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      effectiveType: "4g",
      downlink: null,
      rtt: null,
      saveData: false,
      gpuType: "hardware",
      gpuRenderer: "",
      cpuBenchMs: 0,
      isMobile: false,
      isTablet: false,
      isLowEnd: false,
      isMidRange: false,
      isHighEnd: true,
      score: 100,
      reducedData: false,
      reducedMotion: false,
      lowBattery: false,
      osName: "unknown",
      browserName: "unknown",
      recommended: "performance",
    };
  }

  // Try persisted signals first (set by perf-detect.js)
  const persisted = readPersistedSignals();
  if (persisted) {
    const score = persisted.score ?? 50;
    const isLowEnd = score < 20;
    const isMidRange = score >= 20 && score < 70;
    const isHighEnd = score >= 70;
    return {
      ...persisted,
      deviceMemory: persisted.deviceMemory ?? 8,
      hardwareConcurrency: persisted.hardwareConcurrency ?? 4,
      effectiveType: persisted.effectiveType ?? "4g",
      saveData: !!persisted.saveData,
      isLowEnd,
      isMidRange,
      isHighEnd,
      recommended: decideMode(persisted),
    };
  }

  // Fallback: detect on the fly
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number };
    mozConnection?: { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number };
    webkitConnection?: { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number };
  };

  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  const ua = nav.userAgent || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (nav.maxTouchPoints > 1 && /Macintosh/i.test(ua));
  const deviceMemory = nav.deviceMemory ?? 4;
  const hardwareConcurrency = nav.hardwareConcurrency ?? 4;
  const effectiveType = conn?.effectiveType ?? "4g";
  const saveData = !!conn?.saveData;
  const downlink = conn?.downlink ?? null;
  const rtt = conn?.rtt ?? null;
  const reducedData =
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-data: reduce)").matches;
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowBattery =
    typeof document !== "undefined" && document.documentElement.getAttribute("data-low-battery") === "1";

  // Calculate score
  let score = 50;
  if (deviceMemory >= 8) score += 25;
  else if (deviceMemory >= 4) score += 10;
  else if (deviceMemory >= 2) score -= 5;
  else score -= 25;
  if (hardwareConcurrency >= 8) score += 20;
  else if (hardwareConcurrency >= 4) score += 5;
  else if (hardwareConcurrency >= 2) score -= 10;
  else score -= 25;
  if (effectiveType === "4g") score += 10;
  else if (effectiveType === "3g") score -= 15;
  else if (effectiveType === "2g") score -= 30;
  else if (effectiveType === "slow-2g") score -= 40;
  if (saveData) score -= 30;
  if (downlink && downlink < 1.5) score -= 15;
  if (rtt && rtt > 500) score -= 10;
  if (reducedData) score -= 25;
  if (isMobile && hardwareConcurrency < 4) score -= 15;
  if (isTablet) score += 5;
  if (lowBattery) score -= 20;
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let osName = "unknown";
  if (/Windows/i.test(ua)) osName = "windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) osName = "macos";
  else if (/Android/i.test(ua)) osName = "android";
  else if (/iPhone|iPad|iPod/i.test(ua)) osName = "ios";
  else if (/Linux/i.test(ua)) osName = "linux";
  else if (/CrOS/i.test(ua)) osName = "chromeos";

  let browserName = "unknown";
  if (/Edg\//i.test(ua)) browserName = "edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browserName = "chrome";
  else if (/Firefox\//i.test(ua)) browserName = "firefox";
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browserName = "safari";
  else if (/OPR\//i.test(ua)) browserName = "opera";

  const signals: DeviceSignals = {
    deviceMemory,
    hardwareConcurrency,
    effectiveType,
    downlink,
    rtt,
    saveData,
    gpuType: "unknown",
    gpuRenderer: "",
    cpuBenchMs: 0,
    isMobile,
    isTablet,
    isLowEnd: score < 20,
    isMidRange: score >= 20 && score < 70,
    isHighEnd: score >= 70,
    score,
    reducedData,
    reducedMotion,
    lowBattery,
    osName,
    browserName,
  };

  return {
    ...signals,
    recommended: decideMode(signals),
  };
}

interface EfficiencyContextType {
  /** Current user-selected mode (includes "auto" for auto-detection) */
  mode: PerformanceMode;
  /** Currently effective mode (auto-detected unless user explicitly chose otherwise) */
  effectiveMode: EffectivePerformanceMode;
  /** Set the mode (use "auto" to revert to auto-detection) */
  setMode: (mode: PerformanceMode) => void;
  /** Whether the device is in any reduced-effects mode (lite, balanced, saver, ultra-lite) */
  isEfficiencyMode: boolean;
  /** Whether the effective mode is being auto-detected (mode === "auto") */
  isAutoDetected: boolean;
  /** Detected device capabilities */
  capabilities: PerformanceCapabilities;
  /** Quick check: is at least 'lite' (effects disabled) */
  isLite: boolean;
  /** Quick check: is 'saver' or 'ultra-lite' (maximum savings) */
  isSaver: boolean;
  /** Quick check: is 'ultra-lite' (extreme savings) */
  isUltraLite: boolean;
  /** Re-detect device capabilities (useful when user changes device) */
  redetect: () => void;
}

const EfficiencyContext = createContext<EfficiencyContextType | undefined>(undefined);

/**
 * Convert mode to the class names to apply on documentElement.
 */
function modeToClassNames(mode: EffectivePerformanceMode): string[] {
  if (mode === "ultra-lite") return ["efficiency-mode", "ultra-lite-mode"];
  if (mode === "saver") return ["efficiency-mode"];
  if (mode === "lite") return ["lite-mode"];
  return [];
}

export function EfficiencyProvider({ children }: { children: React.ReactNode }) {
  const [capabilities, setCapabilities] = useState<PerformanceCapabilities>(() => detectCapabilities());
  const [userMode, setUserMode] = useState<PerformanceMode>("auto");

  // Compute the effective mode:
  // - If user explicitly chose a mode, use it
  // - Otherwise, use the auto-detected recommendation
  const isAutoDetected = userMode === "auto";
  const effectiveMode: EffectivePerformanceMode =
    isAutoDetected ? capabilities.recommended : userMode;
  const mode: PerformanceMode = userMode;
  const setMode = (next: PerformanceMode) => setUserMode(next);

  // Listen for low-battery attribute changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      const lb = document.documentElement.getAttribute("data-low-battery") === "1";
      if (lb && !capabilities.lowBattery) {
        setCapabilities((prev) => {
          const next = { ...prev, lowBattery: true };
          next.recommended = decideMode(next);
          return next;
        });
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-low-battery"] });
    return () => observer.disconnect();
  }, [capabilities.lowBattery]);

  // Apply/unapply classes on documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("efficiency-mode", "lite-mode", "ultra-lite-mode");

    const classes = modeToClassNames(effectiveMode);
    for (const c of classes) root.classList.add(c);
    root.setAttribute("data-perf-mode", effectiveMode);
  }, [effectiveMode]);

  // Re-detect on demand (e.g. after page becomes idle, or when network changes)
  const redetect = () => {
    setCapabilities(detectCapabilities());
  };

  const value = useMemo<EfficiencyContextType>(
    () => ({
      mode,
      effectiveMode,
      setMode,
      isLite: effectiveMode === "lite" || effectiveMode === "saver" || effectiveMode === "ultra-lite",
      isSaver: effectiveMode === "saver" || effectiveMode === "ultra-lite",
      isUltraLite: effectiveMode === "ultra-lite",
      isEfficiencyMode: effectiveMode !== "performance",
      isAutoDetected,
      capabilities,
      redetect,
    }),
    [mode, effectiveMode, isAutoDetected, capabilities]
  );

  return React.createElement(EfficiencyContext.Provider, { value }, children);
}

export function useEfficiency() {
  const context = useContext(EfficiencyContext);
  if (context === undefined) {
    throw new Error("useEfficiency must be used within an EfficiencyProvider");
  }
  return context;
}
