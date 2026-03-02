"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Zap,
	Plus,
	FileText,
	Calendar,
	MessageSquare,
	BookOpen,
	Video,
	Image,
	Link as LinkIcon,
	X,
	ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
// import removed

interface QuickAction {
	id: string;
	label: string;
	description?: string;
	icon: React.ReactNode;
	action: () => void;
	color: string;
	shortcut?: string;
	requiresAuth?: boolean;
}

export function QuickActions() {
	const router = useRouter();
	const user: any = null;
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const actions: QuickAction[] = [
		{
			id: "new-course",
			label: "دورة جديدة",
			description: "إنشاء دورة تعليمية جديدة",
			icon: <BookOpen className="h-4 w-4" />,
			action: () => {
				router.push("/courses/new");
				setIsOpen(false);
			},
			color: "bg-blue-500",
			requiresAuth: true,
		},
		{
			id: "new-note",
			label: "ملاحظة جديدة",
			description: "إنشاء ملاحظة سريعة",
			icon: <FileText className="h-4 w-4" />,
			action: () => {
				router.push("/notes/new");
				setIsOpen(false);
			},
			color: "bg-green-500",
			requiresAuth: true,
		},
		{
			id: "new-event",
			label: "حدث جديد",
			description: "إضافة حدث إلى التقويم",
			icon: <Calendar className="h-4 w-4" />,
			action: () => {
				router.push("/schedule/new");
				setIsOpen(false);
			},
			color: "bg-purple-500",
			requiresAuth: true,
		},
		{
			id: "new-post",
			label: "منشور جديد",
			description: "إنشاء منشور في المنتدى",
			icon: <MessageSquare className="h-4 w-4" />,
			action: () => {
				router.push("/forum/new");
				setIsOpen(false);
			},
			color: "bg-orange-500",
			requiresAuth: true,
		},
		{
			id: "upload-video",
			label: "رفع فيديو",
			description: "رفع فيديو تعليمي",
			icon: <Video className="h-4 w-4" />,
			action: () => {
				router.push("/upload/video");
				setIsOpen(false);
			},
			color: "bg-red-500",
			requiresAuth: true,
		},
		{
			id: "upload-image",
			label: "رفع صورة",
			description: "رفع صورة أو مستند",
			icon: <Image className="h-4 w-4" />,
			action: () => {
				router.push("/upload/image");
				setIsOpen(false);
			},
			color: "bg-pink-500",
			requiresAuth: true,
		},
	];

	// Filter actions based on auth
	const availableActions = actions.filter((action) => !action.requiresAuth || user);

	// Keyboard shortcut
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "n") {
				e.preventDefault();
				setIsOpen((prev) => !prev);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	if (availableActions.length === 0) return null;

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					ref={triggerRef}
					variant="default"
					size="icon"
					className={cn(
						"relative h-9 w-9 rounded-lg",
						"bg-gradient-to-br from-primary to-primary/80",
						"hover:from-primary/90 hover:to-primary/70",
						"shadow-md hover:shadow-lg",
						"transition-all duration-300",
						"group"
					)}
					aria-label="إجراءات سريعة"
					title="إجراءات سريعة (Ctrl+Shift+N)"
				>
					<motion.div
						animate={{ rotate: isOpen ? 45 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<Zap className="h-4 w-4 text-primary-foreground" />
					</motion.div>
					{availableActions.length > 0 && (
						<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-500 border-2 border-background flex items-center justify-center">
							<span className="text-[8px] font-bold text-background">{availableActions.length}</span>
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-80 p-2"
				sideOffset={8}
			>
				<DropdownMenuLabel className="px-3 py-2 flex items-center gap-2">
					<Zap className="h-4 w-4 text-primary" />
					<span>إجراءات سريعة</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="grid grid-cols-1 gap-1 p-1">
					<AnimatePresence>
						{availableActions.map((action, index) => (
							<motion.div
								key={action.id}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -10 }}
								transition={{ delay: index * 0.05 }}
							>
								<DropdownMenuItem
									onClick={action.action}
									className={cn(
										"flex items-center gap-3 p-3 rounded-lg cursor-pointer",
										"hover:bg-accent transition-colors",
										"group/item"
									)}
								>
									<div
										className={cn(
											"flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
											"transition-transform duration-200",
											"group-hover/item:scale-110",
											action.color
										)}
									>
										<div className="text-white">{action.icon}</div>
									</div>
									<div className="flex-1 min-w-0 text-right">
										<div className="text-sm font-medium text-foreground">{action.label}</div>
										{action.description && (
											<div className="text-xs text-muted-foreground mt-0.5">{action.description}</div>
										)}
									</div>
									<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
								</DropdownMenuItem>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
				<DropdownMenuSeparator />
				<div className="px-3 py-2 text-xs text-muted-foreground text-center">
					اضغط <kbd className="px-1.5 py-0.5 rounded border bg-muted">Ctrl+Shift+N</kbd> للوصول السريع
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

