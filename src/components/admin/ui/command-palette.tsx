"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Target,
  Gift,
  Trophy,
  Award,
  Crown,
  Bell,
  MessageSquare,
  Newspaper,
  Calendar,
  Gamepad2,
  Settings,
  ScrollText,
  Plus,
  UserPlus,
  FilePlus,
  Zap,
  ArrowRight,
  Command as CommandIcon,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CommandAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string[];
  onSelect: () => void;
  group: string;
  type?: "action" | "nav" | "result";
}

interface ApiResult {
  id: string;
  type: "course" | "teacher" | "forum" | "exam";
  title: string;
  description?: string;
  url: string;
}

const typeIconMap = {
  course: BookOpen,
  teacher: GraduationCap,
  forum: MessageSquare,
  exam: Target,
};

const typeLabelMap = {
  course: "المواد الدراسية",
  teacher: "المعلمين",
  forum: "المنتدى",
  exam: "الامتحانات",
};

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<ApiResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();

  const staticActions: CommandAction[] = React.useMemo(() => [
    // Navigation
    { id: "nav-dashboard", title: "لوحة المعلومات", group: "التنقل", icon: LayoutDashboard, onSelect: () => router.push("/admin") },
    { id: "nav-users", title: "إدارة المستخدمين", group: "التنقل", icon: Users, onSelect: () => router.push("/admin/users") },
    { id: "nav-teachers", title: "إدارة المعلمين", group: "التنقل", icon: GraduationCap, onSelect: () => router.push("/admin/teachers") },
    { id: "nav-analytics", title: "التحليلات والتقارير", group: "التنقل", icon: Zap, onSelect: () => router.push("/admin/analytics") },
    { id: "nav-subjects", title: "المواد الدراسية", group: "التنقل", icon: BookOpen, onSelect: () => router.push("/admin/subjects") },
    { id: "nav-books", title: "مكتبة الكتب", group: "التنقل", icon: FileText, onSelect: () => router.push("/admin/books") },
    { id: "nav-exams", title: "بنك الامتحانات", group: "التنقل", icon: Target, onSelect: () => router.push("/admin/exams") },
    
    // Actions
    { id: "action-add-user", title: "إضافة مستخدم جديد", group: "إجراءات", icon: UserPlus, onSelect: () => router.push("/admin/users?add=true") },
    { id: "action-add-subject", title: "إضافة مادة جديدة", group: "إجراءات", icon: Plus, onSelect: () => router.push("/admin/subjects?add=true") },
    { id: "action-add-exam", title: "إنشاء امتحان جديد", group: "إجراءات", icon: FilePlus, onSelect: () => router.push("/admin/exams/new") },
    { id: "action-announcement", title: "إرسال إعلان عام", group: "إجراءات", icon: Bell, onSelect: () => router.push("/admin/announcements/new") },
    
    // System
    { id: "sys-settings", title: "إعدادات النظام", group: "نظام", icon: Settings, onSelect: () => router.push("/admin/settings") },
  ], [router]);

  // Handle Search API
  React.useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("CommandPalette Search Error:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const allActions = React.useMemo(() => {
    const apiActions: CommandAction[] = searchResults.map((res) => ({
      id: res.id,
      title: res.title,
      description: res.description,
      icon: typeIconMap[res.type] || Search,
      group: typeLabelMap[res.type] || "نتائج البحث",
      onSelect: () => router.push(res.url),
      type: "result",
    }));

    if (!search) return staticActions;

    const filteredStatic = staticActions.filter(a => 
      a.title.toLowerCase().includes(search.toLowerCase()) || 
      a.group.toLowerCase().includes(search.toLowerCase())
    );

    return [...filteredStatic, ...apiActions];
  }, [staticActions, searchResults, search, router]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const handleOpen = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", handleOpen);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", handleOpen);
    };
  }, []);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [open, search, searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allActions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allActions.length) % allActions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allActions[selectedIndex]) {
        allActions[selectedIndex].onSelect();
        setOpen(false);
      }
    }
  };

  const groupedActions = allActions.reduce((acc, action) => {
    if (!acc[action.group]) acc[action.group] = [];
    acc[action.group].push(action);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-2xl overflow-hidden top-[15%] translate-y-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          className="bg-card/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col"
          onKeyDown={handleKeyDown}
        >
          {/* Search Bar */}
          <div className="flex items-center px-4 py-4 border-b border-border/50 bg-white/5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 ml-3">
              {loading ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-primary" />
              )}
            </div>
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/60 pr-0 font-medium"
              placeholder="ابحث عن أي شيء، نفذ إجراءً، أو انتقل لصفحة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50 text-[10px] text-muted-foreground font-mono">
              <span className="text-xs">ESC</span>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-[450px] overflow-y-auto p-2 space-y-4 scrollbar-thin">
            {Object.entries(groupedActions).map(([group, groupActions], groupIdx) => (
              <div key={group} className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center justify-between">
                  <span>{group}</span>
                </div>
                <div className="space-y-0.5">
                  {groupActions.map((action, actionIdx) => {
                    let globalIdx = 0;
                    Object.keys(groupedActions).forEach((g, i) => {
                      if (i < groupIdx) globalIdx += groupedActions[g].length;
                    });
                    globalIdx += actionIdx;

                    const isSelected = selectedIndex === globalIdx;
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.onSelect();
                          setOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-right relative",
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                            : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300",
                          isSelected ? "bg-white/20 rotate-0" : "bg-primary/10 group-hover:bg-primary/20 group-hover:rotate-12"
                        )}>
                          <Icon className={cn("h-4.5 w-4.5", isSelected ? "text-white" : "text-primary")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{action.title}</p>
                          {action.description && (
                            <p className={cn("text-xs truncate max-w-[400px]", isSelected ? "text-white/70" : "text-muted-foreground/60")}>
                              {action.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <motion.div
                            layoutId="indicator"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {allActions.length === 0 && !loading && (
              <div className="py-16 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto ring-1 ring-primary/10">
                  <Search className="h-8 w-8 text-primary/30" />
                </div>
                <div className="space-y-1.5 px-8">
                  <p className="font-bold text-xl text-foreground">لا نتائج لـ "{search}"</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    لم نتمكن من العثور على ما تبحث عنه. جرب مصطلحات أبسط أو ابحث في الأقسام الجانبية.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-4 py-3 bg-white/[0.02] flex items-center justify-between text-[10px] text-muted-foreground/60">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <kbd className="flex h-5 w-5 items-center justify-center rounded bg-white/5 border border-white/10 font-mono shadow-sm">↵</kbd>
                <span className="font-medium">للاختيار</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <kbd className="flex h-5 w-5 items-center justify-center rounded bg-white/5 border border-white/10 font-mono shadow-sm">↑</kbd>
                  <kbd className="flex h-5 w-5 items-center justify-center rounded bg-white/5 border border-white/10 font-mono shadow-sm">↓</kbd>
                </div>
                <span className="font-medium">للتنقل</span>
              </div>
            </div>
            <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-primary/5 border border-primary/10">
              <CommandIcon className="h-3 w-3 text-primary/50" />
              <span className="font-bold text-primary/70 tracking-tight">THANAY COMMAND PALETTE 2.0</span>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
