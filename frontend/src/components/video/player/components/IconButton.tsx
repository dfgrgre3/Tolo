import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconButton({
  icon: Icon,
  label,
  active,
  onClick,
  className,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "group/icon relative flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-all duration-200",
        "hover:bg-white/10 hover:text-white hover:scale-105",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none",
        "active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        active && "bg-white/15 text-white",
        className
      )}
    >
      <Icon className="h-5 w-5 transition-transform duration-200 group-hover/icon:scale-110" />
      {/* Active indicator dot */}
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-400" />
      )}
    </button>
  );
}
