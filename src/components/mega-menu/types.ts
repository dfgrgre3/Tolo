import React from "react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
	badge?: string;
	description?: string;
}

export interface MegaMenuCategory {
	title: string;
	items: NavItem[];
}

export interface MegaMenuProps {
	categories: MegaMenuCategory[];
	isOpen: boolean;
	onClose: () => void;
	activeRoute?: (href: string) => boolean;
	user?: any;
}

