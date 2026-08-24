"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE } from "@thanawy/shared/site-config";

export function HeaderLogo() {
	return (
		<Link
			href="/"
			className="flex items-center gap-3 relative z-50 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
			prefetch={true}
			scroll={true}
			aria-label={`${SITE.name} - الصفحة الرئيسية`}
		>
			<div className="relative shrink-0 flex items-center">
				<Image
					src={SITE.logo}
					alt=""
					width={52}
					height={52}
					className="h-13 w-13 object-contain"
					sizes="52px"
					priority
				/>
			</div>

			<div className="flex flex-col min-w-0 justify-center">
				<span className="text-2xl font-black tracking-tighter leading-none text-foreground">
					{SITE.name}
				</span>
				{SITE.tagline && (
					<span className="text-[9px] font-black tracking-[0.2em] text-orange-700 dark:text-primary whitespace-nowrap mt-0.5 truncate">
						{SITE.tagline}
					</span>
				)}
			</div>
		</Link>
	);
}