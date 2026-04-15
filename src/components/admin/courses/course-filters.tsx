"use client";

import * as React from "react";
import {
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  RefreshCw,
  Plus,
  ChevronDown,
  SlidersHorizontal,
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
}: CourseFiltersProps) {
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("ALL");
  const [status, setStatus] = React.useState("ALL");
  const [category, setCategory] = React.useState("ALL");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);

  const activeFiltersCount = [
    level !== "ALL",
    status !== "ALL",
    category !== "ALL",
    search !== "",
  ].filter(Boolean).length;

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      onSearch(search);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, onSearch]);

  const handleReset = () => {
    setSearch("");
    setLevel("ALL");
    setStatus("ALL");
    setCategory("ALL");
    onSearch("");
    onFilterChange({ level: "ALL", status: "ALL", category: "ALL" });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col gap-3 mb-6" dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-lg">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            placeholder="بحث عن دورة أو كود أو محاضر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-12 rounded-xl border-border/60 bg-background/80 backdrop-blur-sm focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/30 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Results badge */}
          {totalCount !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
              <span className="text-xs font-black text-primary">{totalCount}</span>
              <span className="text-xs text-muted-foreground font-bold">دورة</span>
            </div>
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
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                currentView === "list"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
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
                (isRefreshing || isLoading) && "animate-spin"
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
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          showFilters ? "max-h-40 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
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
      </div>
    </div>
  );
}
