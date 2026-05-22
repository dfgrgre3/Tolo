"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { apiClient } from "@/lib/api/api-client";

const SETTINGS_CACHE_KEY = "tolo-system-settings-v1";

interface SystemFeatures {
  registration: boolean;
  engagement: boolean;
  forum: boolean;
  blog: boolean;
  events: boolean;
  aiAssistant: boolean;
  emailVerification: boolean;
}

interface MaintenanceMode {
  enabled: boolean;
  message: string;
}

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  features: SystemFeatures;
  maintenance: MaintenanceMode;
}

interface SettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  isFeatureEnabled: (feature: keyof SystemFeatures) => boolean;
}

const defaultSettings: SystemSettings = {
  siteName: "Thanawy",
  siteDescription: "منصة تعليمية لإدارة التعلم والمحتوى.",
  features: {
    registration: true,
    engagement: true,
    forum: true,
    blog: true,
    events: true,
    aiAssistant: true,
    emailVerification: true,
  },
  maintenance: {
    enabled: false,
    message: "",
  },
};

function readSettingsFromStorage(): SystemSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SystemSettings;
    if (parsed?.siteName && parsed?.features && parsed?.maintenance) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeSettingsToStorage(next: SystemSettings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    const cached = readSettingsFromStorage();
    if (cached) {
      setSettings(cached);
      setLoading(false);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiClient.get<{ settings: SystemSettings }>("/settings");
      if (data && data.settings) {
        writeSettingsToStorage(data.settings);
        setSettings(data.settings);
      } else {
        logger.warn("Received empty or invalid system settings, using defaults");
        writeSettingsToStorage(defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (error) {
      const isAbortError = error instanceof Error && (
        error.name === 'AbortError' ||
        error.message?.includes('signal is aborted')
      );

      // Check if this is a backend startup race (503/service unavailable).
      // The app falls back to defaults so this is informational, not critical.
      const isServiceUnavailable =
        error instanceof Error &&
        (error.message?.toLowerCase().includes('unavailable') ||
          (error as { status?: number }).status === 503);

      if (isAbortError) {
        logger.debug("System settings fetch aborted (component unmount or timeout)");
      } else if (isServiceUnavailable) {
        logger.warn("Backend not yet available — using cached/default settings", error);
      } else {
        logger.error("Failed to fetch system settings", error);
      }

      setSettings((prev) => {
        if (prev) return prev;
        return defaultSettings;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isFeatureEnabled = (feature: keyof SystemFeatures) => {
    if (!settings) return defaultSettings.features[feature];
    return settings.features[feature] ?? false;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, isFeatureEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
