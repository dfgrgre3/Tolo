"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfiniteScrollProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  className?: string;
  itemClassName?: string;
  threshold?: number;
  loadingComponent?: React.ReactNode;
  endComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function InfiniteScroll<T>({
  items,
  renderItem,
  loadMore,
  hasMore,
  isLoading,
  className,
  itemClassName,
  threshold = 100,
  loadingComponent,
  endComponent,
  emptyComponent,
}: InfiniteScrollProps<T>) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: `${threshold}px`,
  });

  React.useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, hasMore, isLoading, loadMore]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyComponent || "لا توجد بيانات"}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      {items.map((item, index) => (
        <div key={index} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Loading State */}
      {isLoading && (
        <div className="py-4 flex justify-center">
          {loadingComponent || (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Intersection Observer Target */}
      {hasMore && !isLoading && <div ref={ref} className="h-4" />}

      {/* End of List */}
      {!hasMore && items.length > 0 && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          {endComponent || "انتهت القائمة"}
        </div>
      )}
    </div>
  );
}

// Hook for infinite scroll with data fetching
export function useInfiniteScroll<T>(
  fetchData: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>,
  limit: number = 20
) {
  const [items, setItems] = React.useState<T[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadMore = React.useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchData(page, limit);
      setItems((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage((p) => p + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, page, limit, hasMore, isLoading]);

  const refresh = React.useCallback(async () => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsLoading(true);

    try {
      const result = await fetchData(1, limit);
      setItems(result.data);
      setHasMore(result.hasMore);
      setPage(2);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, limit]);

  const reset = React.useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    items,
    hasMore,
    isLoading,
    error,
    loadMore,
    refresh,
    reset,
  };
}

// Paginated list with windowing for very large datasets
interface WindowedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
}

export function WindowedList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className,
}: WindowedListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-auto", className)}
      style={{ height: "100%" }}
      dir="rtl"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
