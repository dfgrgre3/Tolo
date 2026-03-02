"use client";

import React from "react";
import { HydrationFix } from "../utils/HydrationFix";

export default function AppClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <div id="client-layout-root" className="w-full h-full">
      <HydrationFix />
      {children}
    </div>
  );
}
