"use client";

import React from "react";
import Header from "@/components/Header";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <React.Suspense fallback={<div className="h-16 w-full animate-pulse bg-background" />}>
        <Header />
      </React.Suspense>
      {children}
    </>
  );
}
