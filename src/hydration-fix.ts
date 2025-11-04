"use client";

import { useEffect, useState } from "react";

// �?�?���� �?�?���?�?�? �?�?�?�?�? �?�?�?�?���?�? �?�?�?�?�?�?�? �?�? �?�?�?�?�?�? �?�?�?�?���?�?
export function fixHydrationIssues() {
  if (typeof window === "undefined") {
    return;
  }

  // �?���?�?�? �?���?�?�� bis_skin_checked �?�? �?�?�?�? �?�?�?�?�?���?
  const elements = document.querySelectorAll("[bis_skin_checked]");
  elements.forEach((el) => {
    el.removeAttribute("bis_skin_checked");
  });

  // �?���?�?�? �?���?�?�� __processed_*
  // حذف attributes __processed_*
  // لا يمكن استخدام wildcard في CSS selector، لذلك نبحث عن جميع العناصر ثم نتصفى
  const allElements = document.querySelectorAll("*");
  allElements.forEach((el) => {
    Array.from(el.attributes)
      .filter((attr) => attr.name.startsWith("__processed_"))
      .forEach((attr) => el.removeAttribute(attr.name));
  });

  // �?���?�?�? �?���?�?�� bis_register
  const registerElements = document.querySelectorAll("[bis_register]");
  registerElements.forEach((el) => {
    el.removeAttribute("bis_register");
  });
}

// �?���?�?�? �?�?�?�? �?�?�?�?�?�? �?�?�?�?�?�?�? �?�? useEffect
export function useHydrationFix() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    if (typeof window === "undefined") {
      return;
    }

    // �?��?�?�? �?�?�?�?�?�?�� �?�?�?�?�?�? �?�?�?��?�? �?�? ��? �?�?�?�?�?�? �?�? �?�? �?�?�?�?�?�?
    const timeout = window.setTimeout(fixHydrationIssues, 100);

    return () => window.clearTimeout(timeout);
  }, []);

  return hydrated;
}
