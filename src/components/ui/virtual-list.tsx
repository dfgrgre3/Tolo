"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
	items: T[];
	itemHeight: number;
	containerHeight: number;
	renderItem: (item: T, index: number) => React.ReactNode;
	overscan?: number;
	className?: string;
	onScroll?: (scrollTop: number) => void;
	scrollToIndex?: number;
	keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
	items,
	itemHeight,
	containerHeight,
	renderItem,
	overscan = 3,
	className,
	onScroll,
	scrollToIndex,
	keyExtractor,
}: VirtualListProps<T>) {
	const [scrollTop, setScrollTop] = useState(0);
	const scrollElementRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Calculate visible range
	const visibleRange = useMemo(() => {
		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
		const end = Math.min(
			items.length - 1,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
		);
		return { start, end };
	}, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

	// Get visible items
	const visibleItems = useMemo(() => {
		return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
			item,
			index: visibleRange.start + index,
		}));
	}, [items, visibleRange]);

	// Total height of all items
	const totalHeight = items.length * itemHeight;

	// Offset for visible items
	const offsetY = visibleRange.start * itemHeight;

	// Handle scroll
	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const newScrollTop = e.currentTarget.scrollTop;
			setScrollTop(newScrollTop);
			onScroll?.(newScrollTop);
		},
		[onScroll]
	);

	// Scroll to specific index
	useEffect(() => {
		if (scrollToIndex !== undefined && scrollElementRef.current) {
			const targetScrollTop = scrollToIndex * itemHeight;
			scrollElementRef.current.scrollTop = targetScrollTop;
			setScrollTop(targetScrollTop);
		}
	}, [scrollToIndex, itemHeight]);

	return (
		<div
			ref={scrollElementRef}
			onScroll={handleScroll}
			className={cn("overflow-y-auto", className)}
			style={{ height: containerHeight }}
		>
			<div
				ref={containerRef}
				style={{
					height: totalHeight,
					position: "relative",
				}}
			>
				<div
					style={{
						transform: `translateY(${offsetY}px)`,
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
					}}
				>
					{visibleItems.map(({ item, index }) => (
						<m.div
							key={keyExtractor ? keyExtractor(item, index) : index}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2, delay: (index % 10) * 0.01 }}
							style={{ height: itemHeight }}
						>
							{renderItem(item, index)}
						</m.div>
					))}
				</div>
			</div>
		</div>
	);
}

