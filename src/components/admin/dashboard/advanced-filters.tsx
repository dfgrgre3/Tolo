"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminButton } from "../ui/admin-button";
import { AdminBadge } from "../ui/admin-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Filter,
  X,
  Save,
  Trash2,
  ChevronDown,
} from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "text" | "number";
  options?: FilterOption[];
  placeholder?: string;
}

interface ActiveFilter {
  id: string;
  value: string;
  label: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: ActiveFilter[];
  createdAt: Date;
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  onFilterChange: (filters: ActiveFilter[]) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: ActiveFilter[]) => void;
  onDeleteSavedFilter?: (id: string) => void;
  className?: string;
}

export function AdvancedFilters({
  filters,
  onFilterChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteSavedFilter,
  className,
}: AdvancedFiltersProps) {
  const [activeFilters, setActiveFilters] = React.useState<ActiveFilter[]>([]);
  const [selectedFilterId, setSelectedFilterId] = React.useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [filterName, setFilterName] = React.useState("");

  const selectedFilter = filters.find((f) => f.id === selectedFilterId);

  const handleSelectChange = (filterId: string, value: string) => {
    const filter = filters.find((f) => f.id === filterId);
    if (!filter) return;

    const option = filter.options?.find((o) => o.value === value);
    const label = `${filter.label}: ${option?.label || value}`;

    const existingIndex = activeFilters.findIndex((f) => f.id === filterId);
    let newFilters: ActiveFilter[];

    if (existingIndex >= 0) {
      newFilters = [...activeFilters];
      newFilters[existingIndex] = { id: filterId, value, label };
    } else {
      newFilters = [...activeFilters, { id: filterId, value, label }];
    }

    setActiveFilters(newFilters);
    onFilterChange(newFilters);
    setSelectedFilterId("");
  };

  const handleTextFilter = (filterId: string, value: string) => {
    const filter = filters.find((f) => f.id === filterId);
    if (!filter || !value.trim()) return;

    const label = `${filter.label}: ${value}`;
    const newFilters = [...activeFilters, { id: filterId, value, label }];
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
    setSelectedFilterId("");
  };

  const handleRemoveFilter = (id: string) => {
    const newFilters = activeFilters.filter((f) => f.id !== id);
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    onFilterChange([]);
  };

  const handleSaveFilter = () => {
    if (filterName.trim() && activeFilters.length > 0) {
      onSaveFilter?.(filterName.trim(), activeFilters);
      setFilterName("");
      setShowSaveDialog(false);
    }
  };

  const handleLoadSavedFilter = (saved: SavedFilter) => {
    setActiveFilters(saved.filters);
    onFilterChange(saved.filters);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
          {activeFilters.map((filter) => (
            <AdminBadge
              key={filter.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {filter.label}
              <button
                onClick={() => handleRemoveFilter(filter.id)}
                className="p-0.5 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </AdminBadge>
          ))}
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 text-xs"
          >
            مسح الكل
          </AdminButton>
        </div>
      )}

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter selector */}
        <Select value={selectedFilterId} onValueChange={setSelectedFilterId}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="إضافة فلتر..." />
          </SelectTrigger>
          <SelectContent>
            {filters
              .filter((f) => !activeFilters.some((af) => af.id === f.id))
              .map((filter) => (
                <SelectItem key={filter.id} value={filter.id}>
                  {filter.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Dynamic filter input based on type */}
        {selectedFilter && (
          <>
            {selectedFilter.type === "select" && (
              <Select onValueChange={(v) => handleSelectChange(selectedFilter.id, v)}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder={selectedFilter.placeholder || "اختر..."} />
                </SelectTrigger>
                <SelectContent>
                  {selectedFilter.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(selectedFilter.type === "text" || selectedFilter.type === "number") && (
              <Input
                type={selectedFilter.type}
                placeholder={selectedFilter.placeholder}
                className="w-40 h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTextFilter(selectedFilter.id, (e.target as HTMLInputElement).value);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    handleTextFilter(selectedFilter.id, e.target.value);
                  }
                }}
              />
            )}
          </>
        )}

        {/* Save filter button */}
        {activeFilters.length > 0 && onSaveFilter && (
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <AdminButton variant="ghost" size="sm" icon={Save}>
                حفظ
              </AdminButton>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>حفظ الفلتر</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="اسم الفلتر..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
                <AdminButton
                  size="sm"
                  className="w-full"
                  onClick={handleSaveFilter}
                  disabled={!filterName.trim()}
                >
                  حفظ الفلتر
                </AdminButton>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Saved filters */}
        {savedFilters.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <AdminButton variant="ghost" size="sm" icon={Filter}>
                المحفوظة
                <ChevronDown className="h-3 w-3 mr-1" />
              </AdminButton>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>الفلاتر المحفوظة</DialogTitle>
              </DialogHeader>
              <div className="space-y-1 pt-2">
                {savedFilters.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <button
                      onClick={() => handleLoadSavedFilter(saved)}
                      className="flex-1 text-right text-sm"
                    >
                      {saved.name}
                    </button>
                    {onDeleteSavedFilter && (
                      <button
                        onClick={() => onDeleteSavedFilter(saved.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// Quick filter buttons
interface QuickFilter {
  id: string;
  label: string;
  icon?: React.ElementType;
  active?: boolean;
  onClick: () => void;
}

interface QuickFiltersProps {
  filters: QuickFilter[];
  className?: string;
}

export function QuickFilters({ filters, className }: QuickFiltersProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {filters.map((filter) => {
        const Icon = filter.icon;
        return (
          <AdminButton
            key={filter.id}
            variant={filter.active ? "default" : "outline"}
            size="sm"
            onClick={filter.onClick}
            icon={Icon}
          >
            {filter.label}
          </AdminButton>
        );
      })}
    </div>
  );
}
