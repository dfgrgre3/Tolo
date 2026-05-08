"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  Keyboard,
} from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: { level: string; status: string; category: string }) => void;
  onViewChange: (view: "grid" | "list") => void;
  currentView: "grid" | "list";
  categories: Array<{ id: string; name: string }>;
  onRefresh: () => void;
  onAddCourse: () => void;
  totalCount?: number;
  isLoading?: boolean;
  onSortChange?: (sort: string) => void;
}

export function CourseFilters({
  onSearch,
  onFilterChange,
  onViewChange,
  currentView,
  categories,
  onRefresh,
  onAddCourse,
  totalCount,
  isLoading,
  onSortChange,
}: CourseFiltersProps) {
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("ALL");
  const [status, setStatus] = React.useState("ALL");
  const [category, setCategory] = React.useState("ALL");
  const [sort, setSort] = React.useState("newest");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const activeFiltersCount = [
    level !== "ALL",
    status !== "ALL",
    category !== "ALL",
    search !== "",
  ].filter(Boolean).length;

  // Debounced search
  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      onSearch(search);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, onSearch]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl/Cmd + G: Toggle grid/list
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        onViewChange(currentView === "grid" ? "list" : "grid");
      }
      // Ctrl/Cmd + N: Add new course
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onAddCourse();
      }
      // Escape: Clear search
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        setSearch("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, onViewChange, onAddCourse]);

  const handleReset = () => {
    setSearch("");
    setLevel("ALL");
    setStatus("ALL");
    setCategory("ALL");
    setSort("newest");
    onSearch("");
    onFilterChange({ level: "ALL", status: "ALL", category: "ALL" });
    onSortChange?.("newest");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col gap-3 mb-6" dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-lg group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none transition-colors group-focus-within:text-primary" />
          <Input
            ref={searchInputRef}
            placeholder="بحث عن دورة أو كود أو محاضر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-12 rounded-xl border-border/60 bg-background/80 backdrop-blur-sm focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/30 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none">
              <kbd className="h-5 rounded-md border border-border/60 bg-muted/50 px-1.5 text-[9px] font-bold text-muted-foreground/60">
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Results badge */}
          {totalCount !== undefined && (
            <motion.div
              key={totalCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10"
            >
              <span className="text-xs font-black text-primary">{totalCount}</span>
              <span className="text-xs text-muted-foreground font-bold">دورة</span>
            </motion.div>
          )}

          {/* Filter Toggle */}
          <AdminButton
            variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-11 rounded-xl gap-2 font-bold relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">الفلاتر</span>
            {activeFiltersCount > 0 && (
              <Badge className="h-4 min-w-4 rounded-full px-1 text-[9px] font-black bg-white text-primary absolute -top-1.5 -left-1.5 shadow-sm">
                {activeFiltersCount}
              </Badge>
            )}
          </AdminButton>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/50 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => onViewChange("grid")}
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                currentView === "grid"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="عرض شبكي"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                currentView === "list"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="عرض قائمة"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="h-9 w-px bg-border/40" />

          {/* Refresh */}
          <AdminButton
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-11 w-11 rounded-xl"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                (isRefreshing || isLoading) && "animate-spin",
              )}
            />
          </AdminButton>

          {/* Add Course */}
          <AdminButton
            onClick={onAddCourse}
            className="h-11 rounded-xl gap-2 px-5 font-black shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">دورة جديدة</span>
          </AdminButton>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>الفلترة بواسطة:</span>
              </div>

              <Select
                value={level}
                onValueChange={(val) => {
                  setLevel(val);
                  onFilterChange({ level: val, status, category });
                }}
              >
                <SelectTrigger className="w-36 h-10 rounded-xl bg-background/70 text-xs font-bold border-border/60">
                  <SelectValue placeholder="المستوى" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL" className="font-bold text-xs">كل المستويات</SelectItem>
                  <SelectItem value="BEGINNER" className="font-bold text-xs">مبتدئ</SelectItem>
                  <SelectItem value="INTERMEDIATE" className="font-bold text-xs">متوسط</SelectItem>
                  <SelectItem value="ADVANCED" className="font-bold text-xs">متقدم</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val);
                  onFilterChange({ level, status: val, category });
                }}
              >
                <SelectTrigger className="w-36 h-10 rounded-xl bg-background/70 text-xs font-bold border-border/60">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL" className="font-bold text-xs">كل الحالات</SelectItem>
                  <SelectItem value="PUBLISHED" className="font-bold text-xs">منشورة</SelectItem>
                  <SelectItem value="DRAFT" className="font-bold text-xs">مسودة</SelectItem>
                  <SelectItem value="ACTIVE" className="font-bold text-xs">نشطة</SelectItem>
                  <SelectItem value="INACTIVE" className="font-bold text-xs">موقوفة</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={category}
                onValueChange={(val) => {
                  setCategory(val);
                  onFilterChange({ level, status, category: val });
                }}
              >
                <SelectTrigger className="w-40 h-10 rounded-xl bg-background/70 text-xs font-bold border-border/60">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL" className="font-bold text-xs">كل التصنيفات</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="font-bold text-xs">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              {onSortChange && (
                <Select
                  value={sort}
                  onValueChange={(val) => {
                    setSort(val);
                    onSortChange(val);
                  }}
                >
                  <SelectTrigger className="w-40 h-10 rounded-xl bg-background/70 text-xs font-bold border-border/60">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="h-3 w-3" />
                      <SelectValue placeholder="ترتيب" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="newest" className="font-bold text-xs">الأحدث أولاً</SelectItem>
                    <SelectItem value="oldest" className="font-bold text-xs">الأقدم أولاً</SelectItem>
                    <SelectItem value="price-asc" className="font-bold text-xs">السعر: من الأقل</SelectItem>
                    <SelectItem value="price-desc" className="font-bold text-xs">السعر: من الأعلى</SelectItem>
                    <SelectItem value="enrollments" className="font-bold text-xs">الأكثر اشتراكاً</SelectItem>
                    <SelectItem value="name" className="font-bold text-xs">الاسم أبجدياً</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {activeFiltersCount > 0 && (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-10 px-3 rounded-xl gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 font-black text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  مسح الكل
                </AdminButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}