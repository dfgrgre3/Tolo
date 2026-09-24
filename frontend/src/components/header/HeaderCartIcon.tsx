"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/contexts/auth-context";
import { fetchCart, CART_UPDATED_EVENT, cartKeys } from "@/features/cart";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

interface HeaderCartIconProps {
	user: AuthUser | null;
	mounted: boolean;
}

export function HeaderCartIcon({ user, mounted }: HeaderCartIconProps) {
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const [count, setCount] = useState<number | null>(0);

	// Cart badge is a non-critical convenience — never block the header on it.
	// Transport retries transient failures internally; on final failure
	// we just hide the badge rather than keep showing a possibly-stale count.
	const fetchCount = useCallback(async () => {
		try {
			const cached = queryClient.getQueryData<unknown>(cartKeys.detail());
			if (Array.isArray(cached)) {
				setCount(cached.length);
				return;
			}
			const items = await fetchCart();
			setCount(items.length);
			queryClient.setQueryData(cartKeys.detail(), items);
		} catch (error) {
			logger.error("Failed to fetch cart count", error);
			setCount(null);
		}
	}, [queryClient]);

	useEffect(() => {
		if (!mounted || !user) return;
		// Async fetch; setState happens in fetchCount's callback, not synchronously here.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchCount();
	}, [mounted, user, fetchCount, pathname]);

	useEffect(() => {
		if (!mounted || !user) return;
		const onUpdate = (e: Event) => {
			const detail = (e as CustomEvent<number>).detail;
			if (typeof detail === "number") setCount(detail);
			else fetchCount();
		};
		window.addEventListener(CART_UPDATED_EVENT, onUpdate);
		return () => window.removeEventListener(CART_UPDATED_EVENT, onUpdate);
	}, [mounted, user, fetchCount]);

	if (!mounted || !user) return null;

	const hasItems = typeof count === "number" && count > 0;

	return (
		<Button
			asChild
			variant="ghost"
			size="icon"
			className="relative hover:bg-primary/10 dark:hover:bg-primary/15 hover:text-primary h-9 w-9 sm:h-10 sm:w-10 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
		>
			<Link href="/cart" aria-label={`السلة${hasItems ? `، ${count} عنصر` : ""}`}>
				<ShoppingCart className="h-4 w-4" aria-hidden="true" />
				{hasItems && (
					<span
						className="absolute top-1 end-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-2 ring-background"
						aria-hidden="true"
					>
						{count > 9 ? "9+" : count}
					</span>
				)}
			</Link>
		</Button>
	);
}
