"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-black rounded-2xl hover:scale-105 transition-transform shadow-lg"
    >
      <Download className="w-4 h-4" />
      تحميل PDF
    </button>
  );
}