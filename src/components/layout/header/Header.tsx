"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { HeaderDesktop } from "./HeaderDesktop";
import { HeaderMobile } from "./HeaderMobile";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/use-auth";

// Hide the header on auth routes to keep login/register clean
const HIDE_HEADER_PATHS = ["/login", "/register"];

export default function Header() {
	const pathname = usePathname();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const auth = useAuth();
	const user = auth?.user;
	const isAuthenticated = !!user;

	if (pathname && HIDE_HEADER_PATHS.includes(pathname)) {
		return null;
	}

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			{isMobile ? (
				<HeaderMobile pathname={pathname ?? ""} user={user} isAuthenticated={isAuthenticated} />
			) : (
				<HeaderDesktop pathname={pathname ?? ""} user={user} isAuthenticated={isAuthenticated} />
			)}
		</header>
	);
}
