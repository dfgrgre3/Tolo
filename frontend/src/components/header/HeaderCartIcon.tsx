"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";

interface HeaderCartIconProps {
	user: AuthUser | null;
	mounted: boolean;
}

interface CartResponse {
	items?: unknown[];
}

export function HeaderCartIcon({ user, mounted }: HeaderCartIconProps) {
	const pathname = usePathname();
	const [count, setCount] = useState<number | null>(0);

	// Cart badge is a non-critical convenience — never block the header on it.
	// apiClient already retries transient failures internally; on final failure
	// we just hide the badge rather than keep showing a possibly-stale count.
	const fetchCount = useCallback(async () => {
		try {
			const data = await apiClient.get<CartResponse>("/cart");
			setCount(Array.isArray(data?.items) ? data.items.length : 0);
		} catch (error) {
			logger.error("Failed to fetch cart count", error);
			setCount(null);
		}
	}, []);

	useEffect(() => {
		if (!mounted || !user) return;
		fetchCount();
	}, [mounted, user, fetchCount, pathname]);

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
