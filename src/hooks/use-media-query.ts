"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);

    // استخدام addListener بدلاً من addEventListener لدعم المتصفحات القديمة
    if (typeof media.addListener === "function") {
      media.addListener(listener);
    } else {
      media.addEventListener("change", listener);
    }

    return () => {
      if (typeof media.removeListener === "function") {
        media.removeListener(listener);
      } else {
        media.removeEventListener("change", listener);
      }
    };
  }, [matches, query]);

  return matches;
}
