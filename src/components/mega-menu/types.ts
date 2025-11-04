import React from "react";

export interface NavItem {
	href: string;
	label: string;
	icon: React.ReactNode;
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
}

