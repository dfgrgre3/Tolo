"use client";

import * as React from "react";
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  LayoutGrid, 
  List,
  RefreshCw,
  Plus
} from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onViewChange: (view: "grid" | "list") => void;
  currentView: "grid" | "list";
  categories: any[];
  onRefresh: () => void;
  onAddCourse: () => void;
}

export function CourseFilters({
  onSearch,
  onFilterChange,
  onViewChange,
  currentView,
  categories,
  onRefresh,
  onAddCourse
}: CourseFiltersProps) {
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("ALL");
  const [status, setStatus] = React.useState("ALL");
  const [category, setCategory] = React.useState("ALL");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(search);
  };

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
    setIsRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-4 mb-6" dir="rtl">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full lg:max-w-md">
          <Input
            placeholder="بحث عن اسم الدورة أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pr-12 rounded-xl border-primary/10 bg-card/50 backdrop-blur-md shadow-sm transition-all focus:ring-primary/20"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
          <AdminButton 
            type="submit" 
            variant="ghost" 
            size="sm" 
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg font-bold text-[11px] text-primary"
          >
            بحث
          </AdminButton>
        </form>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl shrink-0">
            <AdminButton 
              size="icon-sm" 
              variant={currentView === "grid" ? "default" : "ghost"}
              onClick={() => onViewChange("grid")}
              className={cn("rounded-lg h-9 w-9", currentView === "grid" && "shadow-lg scale-105")}
            >
              <LayoutGrid className="h-4 w-4" />
            </AdminButton>
            <AdminButton 
              size="icon-sm" 
              variant={currentView === "list" ? "default" : "ghost"}
              onClick={() => onViewChange("list")}
              className={cn("rounded-lg h-9 w-9", currentView === "list" && "shadow-lg scale-105")}
            >
              <List className="h-4 w-4" />
            </AdminButton>
          </div>

          <div className="h-8 w-px bg-border/40 shrink-0" />

          {/* Quick Stats Summary */}
          <AdminButton 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="rounded-xl h-11 shrink-0 gap-2 border-primary/10 hover:bg-primary/5"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
            تحديث
          </AdminButton>

          <AdminButton 
            variant="gradient" 
            onClick={onAddCourse}
            className="rounded-xl h-11 shrink-0 gap-2 px-6 font-black shadow-lg"
          >
            <Plus className="h-5 w-5" />
            إضافة دورة جديدة
          </AdminButton>
        </div>
      </div>

      {/* Filters Bar */}
      <AdminCard className="p-3 border-primary/5 bg-primary/5 backdrop-blur-sm rounded-2xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground ml-2">
           <Filter className="h-4 w-4" />
           الفلاتر الذكية:
        </div>

        <Select value={level} onValueChange={(val) => { setLevel(val); onFilterChange({ level: val, status, category }); }}>
          <SelectTrigger className="w-40 h-10 rounded-xl bg-background/50 text-[11px] font-bold">
            <SelectValue placeholder="المستوى" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-primary/20">
            <SelectItem value="ALL" className="font-bold">كل المستويات</SelectItem>
            <SelectItem value="EASY" className="font-bold">مبتدئ</SelectItem>
            <SelectItem value="MEDIUM" className="font-bold">متوسط</SelectItem>
            <SelectItem value="HARD" className="font-bold">متقدم</SelectItem>
            <SelectItem value="EXPERT" className="font-bold">خبير</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(val) => { setStatus(val); onFilterChange({ level, status: val, category }); }}>
          <SelectTrigger className="w-40 h-10 rounded-xl bg-background/50 text-[11px] font-bold">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-primary/20">
            <SelectItem value="ALL" className="font-bold">كل الحالات</SelectItem>
            <SelectItem value="PUBLISHED" className="font-bold">منشورة</SelectItem>
            <SelectItem value="DRAFT" className="font-bold">مسودة</SelectItem>
            <SelectItem value="ACTIVE" className="font-bold">نشطة</SelectItem>
            <SelectItem value="INACTIVE" className="font-bold">موقوفة</SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(val) => { setCategory(val); onFilterChange({ level, status, category: val }); }}>
          <SelectTrigger className="w-40 h-10 rounded-xl bg-background/50 text-[11px] font-bold">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-primary/20">
            <SelectItem value="ALL" className="font-bold">كل التصنيفات</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(level !== "ALL" || status !== "ALL" || category !== "ALL" || search !== "") && (
          <AdminButton 
            variant="ghost" 
            size="sm" 
            onClick={handleReset}
            className="h-9 px-3 rounded-xl gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold text-[11px]"
          >
            <X className="h-4 w-4" />
            مسح الكل
          </AdminButton>
        )}
      </AdminCard>
    </div>
  );
}
