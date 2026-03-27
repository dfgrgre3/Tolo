"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, Clock, Award, TrendingUp } from "lucide-react";
// import removed

import { logger } from '@/lib/logger';

interface ProgressData {
	label: string;
	value: number;
	max: number;
	icon: React.ReactNode;
	color: string;
}

function ProgressIndicator() {
	const pathname = usePathname();
	const authContext: any = { user: null, isAuthenticated: false, isLoading: false };
	const user = authContext?.user ?? null;
	const [progressData, setProgressData] = useState<ProgressData[]>([]);
	const [isVisible, setIsVisible] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Fetch progress data
	useEffect(() => {
		if (!mounted || !user) {
			setIsVisible(false);
			return;
		}

		const fetchProgress = async () => {
			try {
				const [coursesRes, timeRes, achievementsRes] = await Promise.allSettled([
					fetch("/api/users/progress/courses").then((r) => r.json()),
					fetch("/api/users/progress/time").then((r) => r.json()),
					fetch("/api/users/progress/achievements").then((r) => r.json()),
				]);

				const data: ProgressData[] = [];

				if (coursesRes.status === "fulfilled" && coursesRes.value) {
					data.push({
						label: "الدورات",
						value: coursesRes.value.completed || 0,
						max: coursesRes.value.total || 1,
						icon: <BookOpen className="h-3 w-3" />,
						color: "bg-blue-500",
					});
				}

				if (timeRes.status === "fulfilled" && timeRes.value) {
					data.push({
						label: "ساعات الدراسة",
						value: timeRes.value.hours || 0,
						max: timeRes.value.target || 40,
						icon: <Clock className="h-3 w-3" />,
						color: "bg-green-500",
					});
				}

				if (achievementsRes.status === "fulfilled" && achievementsRes.value) {
					data.push({
						label: "الإنجازات",
						value: achievementsRes.value.unlocked || 0,
						max: achievementsRes.value.total || 1,
						icon: <Award className="h-3 w-3" />,
						color: "bg-yellow-500",
					});
				}

				setProgressData(data);
				setIsVisible(data.length > 0);
			} catch (error) {
				logger.debug("Failed to fetch progress:", error);
				setIsVisible(false);
			}
		};

		fetchProgress();
		const interval = setInterval(fetchProgress, 60000); // Update every minute

		return () => clearInterval(interval);
	}, [mounted, user]);

	// Show only on certain pages
	const shouldShow = useMemo(() => {
		if (!mounted) return false;
		const showPages = ["/", "/courses", "/analytics", "/achievements"];
		return showPages.some((page) => pathname?.startsWith(page));
	}, [pathname, mounted]);

	if (!shouldShow || !isVisible || progressData.length === 0) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -10 }}
				className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 backdrop-blur-sm"
			>
				{progressData.slice(0, 2).map((item, index) => {
					const percentage = Math.min((item.value / item.max) * 100, 100);
					return (
						<div key={index} className="flex items-center gap-2 min-w-[120px]">
							<div className={cn("p-1.5 rounded-md", item.color, "text-white")}>
								{item.icon}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between mb-1">
									<span className="text-xs font-medium text-foreground truncate">{item.label}</span>
									<span className="text-xs text-muted-foreground ml-2 shrink-0">
										{Math.round(percentage)}%
									</span>
								</div>
								<Progress value={percentage} className="h-1.5" />
							</div>
						</div>
					);
				})}
			</motion.div>
		</AnimatePresence>
	);
}

export default ProgressIndicator;
