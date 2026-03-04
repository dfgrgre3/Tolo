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

import type { User } from "@/types/user";

export interface MegaMenuProps {
	categories: MegaMenuCategory[];
	isOpen: boolean;
	onClose: () => void;
	activeRoute?: (href: string) => boolean;
	user?: User | null;
}

