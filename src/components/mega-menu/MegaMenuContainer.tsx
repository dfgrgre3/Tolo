"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { m, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface MegaMenuContainerProps {
	children: React.ReactNode;
	menuWidth: string;
}

export function MegaMenuContainer({ children, menuWidth }: MegaMenuContainerProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	
	// Mouse tracking for interactive effects
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);
	const springConfig = { damping: 25, stiffness: 200 };
	const mouseXSpring = useSpring(mouseX, springConfig);
	const mouseYSpring = useSpring(mouseY, springConfig);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!menuRef.current) return;
		const rect = menuRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		mouseX.set(x);
		mouseY.set(y);
	}, [mouseX, mouseY]);

	useEffect(() => {
		if (!menuRef.current) return;
		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [handleMouseMove]);

	return (
		<m.div
			ref={menuRef}
			initial={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(10px)" }}
			animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
			exit={{ opacity: 0, y: -30, scale: 0.95, filter: "blur(10px)" }}
			transition={{ 
				type: "spring",
				stiffness: 500,
				damping: 40,
				mass: 0.8
			}}
			className={cn(
				"fixed left-1/2 -translate-x-1/2 w-full max-w-[110vw] z-50 overflow-hidden",
				`md:${menuWidth} lg:${menuWidth} xl:${menuWidth}`
			)}
			style={{ 
				top: 'var(--header-height, 64px)',
				transition: 'top 0.3s ease-out'
			}}
			data-mega-menu-content
			role="dialog"
			aria-modal="true"
			aria-label="القائمة الرئيسية"
		>
			<div className="relative bg-gradient-to-br from-popover/98 via-popover/95 to-popover/98 backdrop-blur-2xl rounded-b-2xl border-x border-b border-border/60 shadow-2xl shadow-black/50 overflow-hidden">
				{/* Animated mesh gradient background */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/5 via-primary/8 to-primary/12 pointer-events-none" />
				
				{/* Animated gradient overlay with smooth movement */}
				<m.div
					className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 pointer-events-none"
					animate={{
						backgroundPosition: ["0% 0%", "100% 100%"],
						opacity: [0.6, 0.8, 0.6],
					}}
					transition={{
						duration: 10,
						repeat: Infinity,
						repeatType: "reverse",
						ease: "easeInOut"
					}}
				/>
				
				{/* Interactive mouse glow effect */}
				<m.div
					className="absolute pointer-events-none"
					style={{
						left: mouseXSpring,
						top: mouseYSpring,
						translateX: "-50%",
						translateY: "-50%",
						opacity: 0.3,
					}}
				>
					<div className="w-96 h-96 bg-gradient-radial from-primary/40 via-primary/20 to-transparent rounded-full blur-3xl" />
				</m.div>
				
				{/* Shimmer effect */}
				<m.div
					className="absolute inset-0 -translate-x-full pointer-events-none"
					animate={{
						translateX: ["-100%", "200%"],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						repeatDelay: 2,
						ease: "linear"
					}}
				>
					<div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
				</m.div>

				{children}
			</div>
		</m.div>
	);
}
