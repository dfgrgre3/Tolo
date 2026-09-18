import { useEffect, useState } from "react";

/**
 * Viewport-size hook without hydration risk (P1-15).
 *
 * `typeof window !== "undefined" && window.innerWidth < 640` inside render
 * is a hydration mismatch factory: the server renders the desktop path
 * (window undefined) while a mobile client hydrates the mobile path.
 *
 * This hook renders the SAME value on server and during hydration
 * (`false`), then subscribes to matchMedia after mount. No mismatch, no
 * flicker of conflicting trees — plus it tracks resizes/orientation, which
 * a one-time innerWidth read never did.
 */
export function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}
