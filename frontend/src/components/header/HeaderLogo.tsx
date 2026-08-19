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
			<div className="relative shrink-0 translate-y-[7px]">
				<Image
					src={SITE.logo}
					alt=""
					width={68}
					height={68}
					className="h-17 w-17 object-contain"
					sizes="68px"
					priority
				/>
			</div>

			<div className="flex flex-col min-w-0">
				<span className="text-3xl font-black tracking-tighter leading-none text-foreground uppercase">
					{SITE.name}
				</span>
				{SITE.tagline && (
					<span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary whitespace-nowrap mt-0.5 truncate">
						{SITE.tagline}
					</span>
				)}
			</div>
		</Link>
	);
}