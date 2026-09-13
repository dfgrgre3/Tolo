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
	isPriority?: boolean;
	priorityLabel?: string;
	id?: string;
	slug?: string;
	menuKey?: "all-features" | "schools";
	columnKey?: string;
}

export interface MegaMenuProps {
	categories: MegaMenuCategory[];
	isOpen: boolean;
	onClose: () => void;
	activeRoute?: (href: string) => boolean;
  icon?: LucideIcon;
}
