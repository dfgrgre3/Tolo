"use client";

/**
 * ThemeProvider — React 19 compatible theme provider
 *
 * next-themes@0.4.x injects a <script> tag to prevent FOUC, but React 19
 * rejects <script> elements rendered inside components. This custom provider
 * replicates the core behaviour without using <script>:
 *
 *  - Reads the stored theme from localStorage on mount
 *  - Applies/removes the "dark" class on <html> immediately via useLayoutEffect
 *  - Listens for system prefers-color-scheme changes when enableSystem is true
 *  - Syncs across tabs via the storage event
 *
 * The <html> tag in layout.tsx already has suppressHydrationWarning which
 * handles any class mismatch between SSR and the first client paint.
 */

import * as React from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** localStorage key (default: "theme") */
  storageKey?: string;
  /** Starting theme (default: "light") */
  defaultTheme?: Theme;
  /** HTML attribute to toggle ("class" | any data-* attr, default: "class") */
  attribute?: string;
  /** Follow system preference when theme === "system" (default: false) */
  enableSystem?: boolean;
  /** No-op: accepted for API compat with next-themes */
  disableTransitionOnChange?: boolean;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(
  resolved: "light" | "dark",
  attribute: string
) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  } else {
    root.setAttribute(attribute, resolved);
  }
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  storageKey = "theme",
  defaultTheme = "light",
  attribute = "class",
  enableSystem = false,
  disableTransitionOnChange: _ignored,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // SSR: cannot access localStorage
    if (typeof window === "undefined") return defaultTheme;
    try {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const resolvedTheme: "light" | "dark" = React.useMemo(() => {
    if (theme === "system") return enableSystem ? getSystemTheme() : "light";
    return theme;
  }, [theme, enableSystem]);

  // Apply theme class/attribute immediately after every change (before paint)
  React.useLayoutEffect(() => {
    applyTheme(resolvedTheme, attribute);
  }, [resolvedTheme, attribute]);

  // Listen for system preference changes when theme === "system"
  React.useEffect(() => {
    if (!enableSystem || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme(), attribute);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, enableSystem, attribute]);

  // Sync theme changes across browser tabs
  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setThemeState(e.newValue as Theme);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // private browsing / storage quota — ignore
      }
    },
    [storageKey]
  );

  const value = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
