"use client";

import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProgressiveImage } from "@/hooks/use-progressive-loading";
import { useClientEffect } from "@/hooks/use-client-effect";

interface LazyAvatarProps {
	src?: string | null;
	alt?: string;
	fallback?: string;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
	priority?: boolean;
	onLoad?: () => void;
	onError?: (error: Error) => void;
}

const sizeClasses = {
	sm: "h-8 w-8",
	md: "h-10 w-10",
	lg: "h-12 w-12",
	xl: "h-16 w-16",
};

export function LazyAvatar({
	src,
	alt = "Avatar",
	fallback,
	className,
	size = "md",
	priority = false,
	onLoad,
	onError,
}: LazyAvatarProps) {
	const [isInView, setIsInView] = useState(priority);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const avatarRef = useRef<HTMLDivElement>(null);

	const shouldLoad = isInView || priority;
	const { src: loadedSrc, isLoading, error, load } = useProgressiveImage(src || "", {
		priority: shouldLoad && priority,
		lazyLoad: !shouldLoad,
		onLoad,
		onError,
	});

	// Load image when it comes into view
	useClientEffect(() => {
		if (isInView && !shouldLoad && src) {
			load();
		}
	}, [isInView, shouldLoad, src, load]);

	// Intersection Observer for lazy loading
	useEffect(() => {
		if (priority || !avatarRef.current || isInView) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsInView(true);
						if (observerRef.current) {
							observerRef.current.disconnect();
							observerRef.current = null;
						}
					}
				});
			},
			{
				rootMargin: "50px", // Start loading 50px before it comes into view
				threshold: 0.01,
			}
		);

		observerRef.current.observe(avatarRef.current);

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [priority, isInView]);

	// Generate placeholder gradient based on fallback text
	const getPlaceholderGradient = (text: string) => {
		const hash = text.split("").reduce((acc, char) => {
			return char.charCodeAt(0) + ((acc << 5) - acc);
		}, 0);
		const hue = Math.abs(hash) % 360;
		return `hsl(${hue}, 70%, 50%)`;
	};

	const placeholderColor = fallback
		? getPlaceholderGradient(fallback)
		: "hsl(var(--primary))";

	return (
		<div ref={avatarRef} className={cn("relative", className)}>
			<Avatar className={cn(sizeClasses[size], "transition-opacity duration-300", isLoading && "opacity-50")}>
				{isInView && loadedSrc && !error ? (
					<AvatarImage
						src={loadedSrc}
						alt={alt}
						className="object-cover"
					/>
				) : null}
				<AvatarFallback
					className="bg-gradient-to-br text-primary-foreground font-semibold"
					style={{
						background: error || !loadedSrc
							? `linear-gradient(135deg, ${placeholderColor} 0%, ${placeholderColor}dd 100%)`
							: undefined,
					}}
				>
					{fallback || alt?.charAt(0).toUpperCase() || "?"}
				</AvatarFallback>
			</Avatar>
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			)}
		</div>
	);
}

