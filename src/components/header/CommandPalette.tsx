"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  Home,
  BookOpen,
  Users,
  MessageSquare,
  Calendar,
  Settings,
  Bell,
  TrendingUp,
  Clock,
  Award,
  BarChart3,
  ChevronRight,
  Sparkles,
  History,
  Star,
  Mic,
} from "lucide-react";
import { m } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { safeGetItem } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category: string;
  shortcut?: string;
  popular?: boolean;
  recent?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitialRecentItems(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = safeGetItem("command_palette_recent", { fallback: [] });
  return Array.isArray(stored) ? stored : [];
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const user: any = null;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<string[]>(getInitialRecentItems);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("webkitSpeechRecognition" in window)) {
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = "ar-SA";

    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setSelectedIndex(0);
      setIsListening(false);
    };

    recognitionInstance.onerror = (event: any) => {
      logger.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognitionInstance;

    return () => {
      recognitionRef.current?.stop?.();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open || !inputRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        recognitionRef.current?.stop?.();
        setIsListening(false);
        setSearchQuery("");
        setSelectedIndex(0);
      }

      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedIndex(0);
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const baseCommands: CommandItem[] = [
      {
        id: "home",
        label: "ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط©",
        description: "ط§ظ„ط¹ظˆط¯ط© ط¥ظ„ظ‰ ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط©",
        icon: <Home className="h-4 w-4" />,
        action: () => router.push("/"),
        keywords: ["home", "ط±ط¦ظٹط³ظٹط©", "ط¨ط¯ط§ظٹط©"],
        category: "طھظ†ظ‚ظ„",
        shortcut: "Ctrl+H",
      },
      {
        id: "courses",
        label: "ط§ظ„ط¯ظˆط±ط§طھ",
        description: "ط¹ط±ط¶ ط¬ظ…ظٹط¹ ط§ظ„ط¯ظˆط±ط§طھ",
        icon: <BookOpen className="h-4 w-4" />,
        action: () => router.push("/courses"),
        keywords: ["courses", "ط¯ظˆط±ط§طھ", "ظƒظˆط±ط³ط§طھ"],
        category: "طھط¹ظ„ظٹظ…",
        popular: true,
      },
      {
        id: "teachers",
        label: "ط§ظ„ظ…ط¹ظ„ظ…ظٹظ†",
        description: "ط§ط³طھظƒط´ظپ ط§ظ„ظ…ط¹ظ„ظ…ظٹظ†",
        icon: <Users className="h-4 w-4" />,
        action: () => router.push("/teachers"),
        keywords: ["teachers", "ظ…ط¹ظ„ظ…ظٹظ†", "ط£ط³ط§طھط°ط©"],
        category: "طھط¹ظ„ظٹظ…",
      },
      {
        id: "forum",
        label: "ط§ظ„ظ…ظ†طھط¯ظ‰",
        description: "ظ…ظ†ط§ظ‚ط´ط§طھ ظˆظ…ط­ط§ط¯ط«ط§طھ",
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => router.push("/forum"),
        keywords: ["forum", "ظ…ظ†طھط¯ظ‰", "ظ…ظ†ط§ظ‚ط´ط§طھ"],
        category: "ظ…ط¬طھظ…ط¹",
      },
      {
        id: "schedule",
        label: "ط§ظ„ط¬ط¯ظˆظ„ ط§ظ„ط²ظ…ظ†ظٹ",
        description: "ط¹ط±ط¶ ط¬ط¯ظˆظ„ظƒ ط§ظ„ط²ظ…ظ†ظٹ",
        icon: <Calendar className="h-4 w-4" />,
        action: () => router.push("/schedule"),
        keywords: ["schedule", "ط¬ط¯ظˆظ„", "ظ…ظˆط§ط¹ظٹط¯"],
        category: "طھظ†ط¸ظٹظ…",
        popular: true,
      },
      {
        id: "time",
        label: "ط¥ط¯ط§ط±ط© ط§ظ„ظˆظ‚طھ",
        description: "طھطھط¨ط¹ ظˆظ‚طھظƒ ط§ظ„ط¯ط±ط§ط³ظٹ",
        icon: <Clock className="h-4 w-4" />,
        action: () => router.push("/time"),
        keywords: ["time", "ظˆظ‚طھ", "طھطھط¨ط¹"],
        category: "ط¥ظ†طھط§ط¬ظٹط©",
        popular: true,
      },
      {
        id: "analytics",
        label: "ط§ظ„ط¥ط­طµط§ط¦ظٹط§طھ",
        description: "ط¹ط±ط¶ ط¥ط­طµط§ط¦ظٹط§طھظƒ",
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => router.push("/analytics"),
        keywords: ["analytics", "ط¥ط­طµط§ط¦ظٹط§طھ", "ط¥ط­طµط§ط¦ظٹط§طھ"],
        category: "طھط­ظ„ظٹظ„ط§طھ",
      },
      {
        id: "achievements",
        label: "ط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ",
        description: "ط¹ط±ط¶ ط¥ظ†ط¬ط§ط²ط§طھظƒ",
        icon: <Award className="h-4 w-4" />,
        action: () => router.push("/achievements"),
        keywords: ["achievements", "ط¥ظ†ط¬ط§ط²ط§طھ", "ط¬ظˆط§ط¦ط²"],
        category: "ط¥ظ†ط¬ط§ط²ط§طھ",
      },
      {
        id: "leaderboard",
        label: "ظ„ظˆط­ط© ط§ظ„ظ…طھطµط¯ط±ظٹظ†",
        description: "طھط±طھظٹط¨ ط§ظ„ط·ظ„ط§ط¨",
        icon: <TrendingUp className="h-4 w-4" />,
        action: () => router.push("/leaderboard"),
        keywords: ["leaderboard", "ظ…طھطµط¯ط±ظٹظ†", "طھط±طھظٹط¨"],
        category: "طھظ†ط§ظپط³",
      },
    ];

    if (user) {
      baseCommands.push(
        {
          id: "settings",
          label: "ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ",
          description: "طھط¹ط¯ظٹظ„ ط¥ط¹ط¯ط§ط¯ط§طھظƒ",
          icon: <Settings className="h-4 w-4" />,
          action: () => router.push("/settings"),
          keywords: ["settings", "ط¥ط¹ط¯ط§ط¯ط§طھ", "ط®ظٹط§ط±ط§طھ"],
          category: "ط­ط³ط§ط¨",
        },
        {
          id: "notifications",
          label: "ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ",
          description: "ط¹ط±ط¶ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ",
          icon: <Bell className="h-4 w-4" />,
          action: () => {
            const trigger = document.querySelector(
              "[data-notification-trigger]"
            ) as HTMLElement | null;
            trigger?.click();
          },
          keywords: ["notifications", "ط¥ط´ط¹ط§ط±ط§طھ", "طھظ†ط¨ظٹظ‡ط§طھ"],
          category: "ط­ط³ط§ط¨",
          shortcut: "Ctrl+N",
        }
      );
    }

    return baseCommands.map((command) => ({
      ...command,
      recent: recentItems.includes(command.id),
    }));
  }, [recentItems, router, user]);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...allCommands].sort((a, b) => {
        if (a.recent && !b.recent) return -1;
        if (!a.recent && b.recent) return 1;
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return 0;
      });
    }

    const query = searchQuery.toLowerCase();
    return allCommands.filter((command) => {
      const matchesLabel = command.label.toLowerCase().includes(query);
      const matchesDescription = command.description?.toLowerCase().includes(query);
      const matchesKeywords = command.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(query)
      );
      return matchesLabel || matchesDescription || matchesKeywords;
    });
  }, [allCommands, searchQuery]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    filteredCommands.forEach((command) => {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    });

    return groups;
  }, [filteredCommands]);

  const handleSelect = useCallback(
    (command: CommandItem) => {
      command.action();

      const updated = [command.id, ...recentItems.filter((id) => id !== command.id)].slice(0, 5);
      setRecentItems(updated);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("command_palette_recent", JSON.stringify(updated));
        } catch (_error) {
          // Ignore storage errors
        }
      }

      handleOpenChange(false);
    },
    [handleOpenChange, recentItems]
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredCommands[selectedIndex]);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, handleOpenChange, handleSelect, open, selectedIndex]);

  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) {
      return;
    }

    const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        aria-label="ظ„ظˆط­ط© ط§ظ„ط£ظˆط§ظ…ط±"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ط§ط¨ط­ط« ط¹ظ† ط¯ط±ظˆط³طŒ ظ…ظ„ظپط§طھطŒ ط£ظˆ ط£ظˆط§ظ…ط±... (O+C+R)"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-auto py-2"
              aria-label="ط¨ط­ط« ظپظٹ ظ„ظˆط­ط© ط§ظ„ط£ظˆط§ظ…ط±"
            />

            <div className="flex items-center gap-2">
              {typeof window !== "undefined" && "webkitSpeechRecognition" in window ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-300",
                    isListening
                      ? "bg-red-500/10 text-red-500 animate-pulse"
                      : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  )}
                  onClick={toggleListening}
                  title={isListening ? "ط¥ظٹظ‚ط§ظپ ط§ظ„ط§ط³طھظ…ط§ط¹" : "ط¨ط­ط« طµظˆطھظٹ"}
                >
                  <Mic className={cn("h-4 w-4", isListening && "fill-current")} />
                </Button>
              ) : null}

              {searchQuery ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => handleSearchChange("")}
                  aria-label="ظ…ط³ط­ ط§ظ„ط¨ط­ط«"
                >
                  <Command className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto" ref={listRef}>
            {filteredCommands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm font-medium text-foreground mb-1">ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬</p>
                <p className="text-xs text-muted-foreground">ط¬ط±ط¨ ط§ظ„ط¨ط­ط« ط¨ظƒظ„ظ…ط§طھ ظ…ط®طھظ„ظپط©</p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedCommands).map(([category, commands]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </div>
                    <div className="space-y-1">
                      {commands.map((command) => {
                        const globalIndex = filteredCommands.indexOf(command);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <m.button
                            key={command.id}
                            onClick={() => handleSelect(command)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-all",
                              "hover:bg-accent focus:bg-accent focus:outline-none",
                              isSelected && "bg-accent ring-2 ring-primary/20"
                            )}
                            whileHover={{ x: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center h-8 w-8 rounded-md shrink-0",
                                "bg-primary/10 text-primary",
                                isSelected && "bg-primary text-primary-foreground"
                              )}
                            >
                              {command.icon}
                            </div>

                            <div className="flex-1 min-w-0 text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {command.label}
                                </span>
                                {command.recent ? (
                                  <History className="h-3 w-3 text-primary shrink-0" />
                                ) : null}
                                {command.popular ? (
                                  <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                                ) : null}
                              </div>
                              {command.description ? (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {command.description}
                                </p>
                              ) : null}
                            </div>

                            {command.shortcut ? (
                              <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                {command.shortcut}
                              </kbd>
                            ) : null}

                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </m.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="h-4 px-1.5 rounded border bg-background">Up/Down</kbd>
                <span>للتنقل</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="h-4 px-1.5 rounded border bg-background">Enter</kbd>
                <span>للاختيار</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="h-4 px-1.5 rounded border bg-background">Esc</kbd>
                <span>للإغلاق</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Command Palette</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
