"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CoursePaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
}

export function CoursePagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  className,
}: CoursePaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (page > 3) pages.push("ellipsis");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push("ellipsis");

    pages.push(totalPages);
    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate current range
  const rangeStart = total ? Math.min((page - 1) * limit + 1, total) : 0;
  const rangeEnd = total ? Math.min(page * limit, total) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 pt-6",
        className,
      )}
      dir="rtl"
    >
      {/* Info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {total !== undefined && (
          <span className="font-bold">
            عرض {rangeStart}–{rangeEnd} من{" "}
            <span className="font-black text-foreground">{total}</span>
          </span>
        )}
        {onLimitChange && (
          <Select
            value={String(limit)}
            onValueChange={(val) => onLimitChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-20 rounded-xl border-border/50 text-[10px] font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {[8, 12, 20, 40, 60].map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs font-bold">
                  {size} / صفحة
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {/* First */}
        <AdminButton
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="h-9 w-9 rounded-xl"
          aria-label="الصفحة الأولى"
        >
          <ChevronsRight className="h-4 w-4" />
        </AdminButton>

        {/* Previous */}
        <AdminButton
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="h-9 w-9 rounded-xl"
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="h-4 w-4" />
        </AdminButton>

        {/* Numbers */}
        {visiblePages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-9 w-9 items-center justify-center text-xs text-muted-foreground"
            >
              ⋯
            </span>
          ) : (
            <motion.button
              key={p}
              onClick={() => onPageChange(p)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "h-9 min-w-9 rounded-xl px-2 text-xs font-black transition-all",
                p === page
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-label={`الصفحة ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </motion.button>
          ),
        )}

        {/* Next */}
        <AdminButton
          variant="ghost"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="h-9 w-9 rounded-xl"
          aria-label="الصفحة التالية"
        >
          <ChevronLeft className="h-4 w-4" />
        </AdminButton>

        {/* Last */}
        <AdminButton
          variant="ghost"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-9 w-9 rounded-xl"
          aria-label="الصفحة الأخيرة"
        >
          <ChevronsLeft className="h-4 w-4" />
        </AdminButton>
      </div>
    </motion.div>
  );
}
