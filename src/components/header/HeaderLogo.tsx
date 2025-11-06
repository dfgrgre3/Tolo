"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

export function HeaderLogo() {
	return (
		<Link href="/" className="flex items-center gap-3 group" suppressHydrationWarning>
			<motion.div 
				className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30"
				whileHover={{ scale: 1.1, rotate: [0, -5] }}
				whileTap={{ scale: 0.95 }}
				transition={{ 
					scale: { type: "spring", stiffness: 400, damping: 17 },
					rotate: { type: "tween", duration: 0.3, ease: "easeInOut" }
				}}
			>
				<GraduationCap className="h-5 w-5 relative z-10" />
				<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
				<div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
			</motion.div>
			<div className="flex flex-col">
				<span className="font-bold text-lg leading-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text transition-all group-hover:scale-105 inline-block group-hover:from-primary group-hover:via-primary/90 group-hover:to-primary/80">
					ثانوية بذكاء
				</span>
				<span className="text-xs text-muted-foreground leading-tight hidden sm:block opacity-80 group-hover:opacity-100 transition-opacity">
					ThanaWy Smart
				</span>
			</div>
		</Link>
	);
}

