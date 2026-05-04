"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    width?: number;
    cell: (item: T) => React.ReactNode;
  }[];
  rowHeight?: number;
  headerHeight?: number;
  className?: string;
  onRowClick?: (item: T) => void;
  selectedRowId?: string;
  getRowId: (item: T) => string;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 48,
  headerHeight = 40,
  className,
  onRowClick,
  selectedRowId,
  getRowId,
}: VirtualTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative overflow-auto border rounded-lg",
        "h-[600px] w-full",
        className
      )}
      dir="rtl"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex bg-muted/50 border-b font-medium text-sm"
        style={{ height: headerHeight }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex items-center px-4 py-2 border-l last:border-l-0"
            style={{ width: col.width, minWidth: col.width }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtual List */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = data[virtualRow.index];
          const rowId = getRowId(item);
          const isSelected = selectedRowId === rowId;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={cn(
                "absolute top-0 left-0 flex w-full border-b last:border-b-0",
                "hover:bg-muted/30 transition-colors cursor-pointer",
                isSelected && "bg-primary/10 hover:bg-primary/15"
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center px-4 py-2 border-l last:border-l-0 overflow-hidden"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.cell(item)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          لا توجد بيانات
        </div>
      )}
    </div>
  );
}

// Hook for using virtual list with data fetching
export function useVirtualData<T>(
  fetchData: (offset: number, limit: number) => Promise<{ data: T[]; total: number }>,
  pageSize: number = 100
) {
  const [data, setData] = React.useState<T[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const loadedRanges = React.useRef<Set<number>>(new Set());

  const loadRange = React.useCallback(
    async (startIndex: number, endIndex: number) => {
      const startPage = Math.floor(startIndex / pageSize);
      const endPage = Math.floor(endIndex / pageSize);

      const pagesToLoad: number[] = [];
      for (let page = startPage; page <= endPage; page++) {
        if (!loadedRanges.current.has(page)) {
          pagesToLoad.push(page);
        }
      }

      if (pagesToLoad.length === 0) return;

      setIsLoading(true);
      try {
        const results = await Promise.all(
          pagesToLoad.map((page) => fetchData(page * pageSize, pageSize))
        );

        const newData = [...data];
        results.forEach((result, idx) => {
          const page = pagesToLoad[idx];
          const startIdx = page * pageSize;
          result.data.forEach((item, i) => {
            newData[startIdx + i] = item;
          });
          loadedRanges.current.add(page);
          setTotal(result.total);
        });

        setData(newData);
      } finally {
        setIsLoading(false);
      }
    },
    [data, fetchData, pageSize]
  );

  return {
    data,
    total,
    isLoading,
    loadRange,
    refresh: () => {
      loadedRanges.current.clear();
      setData([]);
    },
  };
}
