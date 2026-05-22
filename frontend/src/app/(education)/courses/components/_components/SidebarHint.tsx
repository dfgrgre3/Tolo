"use client";

import { Lock } from "lucide-react";

interface SidebarHintProps {
  visible: boolean;
}

export function SidebarHint({ visible }: SidebarHintProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-[22px] border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-white/55 backdrop-blur-lg lg:block">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" />
        <span>الأدوات الجانبية ستتوسع تلقائيًا عند وجود معالم أو ملاحظات أو دروس.</span>
      </div>
    </div>
  );
}
