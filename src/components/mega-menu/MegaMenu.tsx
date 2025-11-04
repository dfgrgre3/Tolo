"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/button";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { MegaMenuProps } from "./types";
import { MegaMenuContent } from "./MegaMenuContent";

interface MegaMenuComponentProps extends MegaMenuProps {
	label: string;
	className?: string;
	onOpen?: () => void;
}

export function MegaMenu({ 
	categories, 
	isOpen, 
	onClose, 
	activeRoute,
	label,
	className,
	onOpen
}: MegaMenuComponentProps) {
	const megaMenuRef = useRef<HTMLDivElement>(null);

	return (
		<div className="relative group" ref={megaMenuRef}>
			<Button
				variant="ghost"
				className={cn(
					"relative flex items-center gap-2 px-4 py-2.5 transition-all duration-300",
					"hover:bg-primary/10 hover:text-primary",
					isOpen && "bg-primary/15 text-primary shadow-sm",
					className
				)}
				onMouseEnter={() => {
					if (onOpen && !isOpen) {
						onOpen();
					}
				}}
				onClick={() => {
					if (isOpen) {
						onClose();
					} else if (onOpen) {
						onOpen();
					}
				}}
				data-mega-menu-trigger
			>
				<span className="font-medium">{label}</span>
				<ChevronDown
					className={cn(
						"h-4 w-4 transition-all duration-300",
						isOpen && "rotate-180"
					)}
				/>
				{isOpen && (
					<motion.div
						className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
						layoutId={`megaMenuIndicator-${label}`}
						initial={false}
						transition={{ type: "spring", stiffness: 380, damping: 30 }}
					/>
				)}
			</Button>

			<AnimatePresence>
				{isOpen && (
					<div data-mega-menu-content>
						<MegaMenuContent
							categories={categories}
							isOpen={isOpen}
							onClose={onClose}
							activeRoute={activeRoute}
						/>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}

