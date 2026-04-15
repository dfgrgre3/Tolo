"use client";
import { cn } from "@/lib/utils";
import { Search, Command } from "lucide-react";

interface SearchResult {
  id: string;
  type: "user" | "subject" | "exam" | "challenge" | "event" | "post";
  title: string;
  description?: string;
  href: string;
  icon?: React.ElementType;
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onSelect?: (result: SearchResult) => void;
  shortcut?: string;
  onFocus?: () => void;
}

export function GlobalSearch({
  className,
  placeholder = "بحث في المستخدمين، المواد، الامتحانات...",
  shortcut = "k",
  onFocus,
}: GlobalSearchProps) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      onFocus={onFocus}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border bg-card/50 hover:bg-accent hover:border-primary/50 transition-all duration-300 text-sm group w-full shadow-sm hover:shadow-md",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        <Search className="h-5 w-5" />
      </div>
      <span className="text-muted-foreground font-medium flex-1 text-right">{placeholder}</span>
      <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border/50 text-[10px] text-muted-foreground font-mono shadow-inner group-hover:bg-background transition-colors">
        <Command className="h-3 w-3" />
        {shortcut.toUpperCase()}
      </div>
    </button>
  );
}

// Search button for sidebar/header
export function GlobalSearchButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        onClick?.();
        window.dispatchEvent(new CustomEvent("open-command-palette"));
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors shadow-sm",
        className
      )}
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">بحث...</span>
      <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground mr-auto border">
        <Command className="h-3 w-3" />
        K
      </kbd>
    </button>
  );
}
