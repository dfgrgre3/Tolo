import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition-all",
        active
          ? "bg-white text-slate-950 shadow-lg shadow-black/10"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
