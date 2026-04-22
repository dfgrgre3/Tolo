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
  Bell,
  MessageSquare,
  Settings,
  ScrollText,
  Plus,
  UserPlus,
  Zap,
  ArrowRight,
  Loader2,
  Bot,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";
import { logger } from '@/lib/logger';

import {
  Dialog,
  DialogContent,
  DialogTitle,
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
  const { playSound } = usePremiumSounds();

  const staticActions: CommandAction[] = React.useMemo(() => [
    // Navigation
    { id: "nav-dashboard", title: "لوحة المعلومات", description: "العودة للقاعدة الرئيسية", group: "التنقل الاستراتيجي", icon: LayoutDashboard, onSelect: () => router.push("/admin") },
    { id: "nav-users", title: "إدارة المحاربين", description: "عرض والتحكم في جميع المستخدمين", group: "التنقل الاستراتيجي", icon: Users, onSelect: () => router.push("/admin/users") },
    { id: "nav-teachers", title: "قادة الفرق (المعلمين)", description: "إدارة الطاقم التعليمي", group: "التنقل الاستراتيجي", icon: GraduationCap, onSelect: () => router.push("/admin/teachers") },
    { id: "nav-analytics", title: "مركز الاستخبارات", description: "تحليلات البيانات العميقة", group: "التنقل الاستراتيجي", icon: Zap, onSelect: () => router.push("/admin/analytics") },
    
    // Actions - Operations
    { id: "action-add-user", title: "تجنيد طالب جديد", description: "إضافة ملف طالب للقاعدة", group: "إجراءات ميدانية", icon: UserPlus, onSelect: () => router.push("/admin/users?add=true") },
    { id: "action-add-subject", title: "إنشاء مادة دراسية", description: "بناء مسار تعليمي جديد", group: "إجراءات ميدانية", icon: Plus, onSelect: () => router.push("/admin/subjects?add=true") },
    { id: "action-send-notif", title: "إصدار نداء عام (إعلان)", description: "إرسال تنبيه لجميع المحاربين", group: "إجراءات ميدانية", icon: Bell, onSelect: () => router.push("/admin/announcements/new") },
    { id: "action-gen-report", title: "استخراج تقرير الحالة", description: "توليد ملف PDF للأداء العام", group: "إجراءات ميدانية", icon: FileText, onSelect: () => router.push("/admin/reports") },
    
    // AI Commands
    { id: "ai-briefing", title: "استدعاء الملخص الذكي", description: "تحليل AI فوري للحالة الراهنة", group: "الأوامر العليا (AI)", icon: Bot, onSelect: () => router.push("/admin/ai") },
    { id: "ai-fix-curriculum", title: "اقتراح تحسينات المنهج", description: "تحليل الثغرات في المحتوى", group: "الأوامر العليا (AI)", icon: Target, onSelect: () => router.push("/admin/ai?tab=studio") },
    
    // System
    { id: "sys-settings", title: "بروتوكولات النظام", description: "تعديل إعدادات المملكة", group: "النظام", icon: Settings, onSelect: () => router.push("/admin/settings") },
    { id: "sys-audit", title: "سجل العمليات (Audit)", description: "مراقبة كافة التحركات", group: "النظام", icon: ScrollText, onSelect: () => router.push("/admin/audit-logs") },
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
        logger.error("CommandPalette Search Error:", err);
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
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.group.toLowerCase().includes(search.toLowerCase())
    );

    return [...filteredStatic, ...apiActions];
  }, [staticActions, searchResults, search, router]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) playSound('open');
          else playSound('close');
          return !prev;
        });
      }
    };

    const handleOpen = () => {
      playSound('open');
      setOpen(true);
    };

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", handleOpen);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", handleOpen);
    };
  }, [playSound]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [open, search, searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      playSound('hover');
      setSelectedIndex((prev) => (prev + 1) % allActions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      playSound('hover');
      setSelectedIndex((prev) => (prev - 1 + allActions.length) % allActions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allActions[selectedIndex]) {
        playSound('success');
        allActions[selectedIndex].onSelect();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      playSound('close');
    }
  };

  const groupedActions = allActions.reduce((acc, action) => {
    if (!acc[action.group]) acc[action.group] = [];
    acc[action.group].push(action);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) playSound('close');
      setOpen(val);
    }}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-2xl overflow-hidden top-[15%] translate-y-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20, rotateX: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10, rotateX: 5 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-card/90 backdrop-blur-3xl border border-white/10 shadow-[0_0_100px_-20px_rgba(var(--primary),0.3)] rounded-[2.5rem] overflow-hidden flex flex-col perspective-1000"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">لوحة الأوامر</DialogTitle>
          {/* Search Bar */}
          <div className="flex items-center px-6 py-5 border-b border-white/5 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
            <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-primary/20 ml-4 relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
              {loading ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin relative z-10" />
              ) : (
                <Zap className="h-5 w-5 text-primary relative z-10" />
              )}
            </div>
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-xl placeholder:text-muted-foreground/40 pr-0 font-black tracking-tight"
              placeholder="???????? ?????????? ???????????? ???? ???????? ???? ??????????????..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="بحث في لوحة الأوامر"
            />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-black uppercase tracking-widest whitespace-nowrap">
              <span className="text-xs">CTRL + K</span>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {Object.entries(groupedActions).map(([group, groupActions], groupIdx) => (
              <div key={group} className="space-y-2">
                <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center justify-between">
                  <span>{group}</span>
                </div>
                <div className="space-y-1">
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
                          playSound('success');
                          action.onSelect();
                          setOpen(false);
                        }}
                        onMouseEnter={() => {
                          if (!isSelected) playSound('hover');
                          setSelectedIndex(globalIdx);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-right relative overflow-hidden",
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/40 -translate-x-2" 
                            : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isSelected && (
                          <motion.div 
                            layoutId="active-shine"
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full animate-[shimmer_2s_infinite]" 
                          />
                        )}
                        
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-500",
                          isSelected ? "bg-white/20 rotate-0 scale-110" : "bg-primary/5 group-hover:bg-primary/10 group-hover:rotate-12"
                        )}>
                          <Icon className={cn("h-5 w-5", isSelected ? "text-white" : "text-primary")} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-base tracking-tight">{action.title}</p>
                          {action.description && (
                            <p className={cn("text-xs truncate max-w-[420px] font-bold mt-0.5", isSelected ? "text-white/70" : "text-muted-foreground/50")}>
                              {action.description}
                            </p>
                          )}
                        </div>
                        
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">تفعيل</span>
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
              <div className="py-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="h-20 w-20 rounded-[2rem] bg-primary/5 flex items-center justify-center mx-auto ring-1 ring-primary/20 relative">
                  <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                  <Search className="h-10 w-10 text-primary/30 relative z-10" />
                </div>
                <div className="space-y-2 px-10">
                  <p className="font-black text-2xl text-foreground">المخطوطات مفقودة!</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto font-bold opacity-60 italic">
                    &ldquo;???? ?????? ?????????? ?????? ???????? ?????? ???? ?????????? ?????????????? ??????????????..&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-6 py-4 bg-primary/5 flex items-center justify-between text-[11px] text-muted-foreground/60">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <kbd className="flex h-6 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 font-black shadow-inner">â†µ</kbd>
                <span className="font-black uppercase tracking-widest">تأكيد</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <kbd className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/10 font-black shadow-inner">â†‘</kbd>
                  <kbd className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/10 font-black shadow-inner">â†“</kbd>
                </div>
                <span className="font-black uppercase tracking-widest">تحرك</span>
              </div>
            </div>
            <div className="flex items-center gap-3 py-1.5 px-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-black text-primary tracking-[0.2em] text-[9px] uppercase">Nexus OS v2.0 // COMMAND_LINE</span>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
