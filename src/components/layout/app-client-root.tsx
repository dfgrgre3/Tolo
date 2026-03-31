"use client";

import React, { useEffect } from "react";
import { HydrationFix } from "../hydration-fix";
import { initializeSettings } from "@/lib/settings-initializer";

export default function AppClientRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize settings on app startup
    initializeSettings().catch(console.error);
  }, []);

  return (
    <div id="client-layout-root" className="w-full h-full">
      <HydrationFix />
      {children}
    </div>
  );
}
