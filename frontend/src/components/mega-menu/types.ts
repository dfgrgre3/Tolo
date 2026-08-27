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
}

import type { AuthUser } from "@/contexts/auth-context";

export interface MegaMenuProps {
	categories: MegaMenuCategory[];
	isOpen: boolean;
	onClose: () => void;
	activeRoute?: (href: string) => boolean;
	user?: AuthUser | null;
}

// Backend API response types
export interface BackendNavItem {
	id: string;
	href: string;
	label: string;
	description?: string;
	icon?: string;
	badge?: string;
}

export interface BackendNavCategory {
	id: string;
	title: string;
	slug: string;
	items: BackendNavItem[];
	isPriority?: boolean;
	priorityLabel?: string;
}

export interface BackendNavMenu {
	categories: BackendNavCategory[];
	updatedAt: string;
}

