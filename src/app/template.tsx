"use client";

import React from "react";
import Header from "@/components/header";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
