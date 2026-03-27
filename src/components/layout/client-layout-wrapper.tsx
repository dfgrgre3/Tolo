"use client";

import React from "react";

/**
 * ClientLayoutWrapper component
 * Simplified version to resolve runtime TypeError
 */
export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Return standard container
  return (
    <div id="client-layout-root" className="w-full h-full">
      {children}
    </div>
  );
}
