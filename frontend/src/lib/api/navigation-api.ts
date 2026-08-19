import { apiClient } from './api-client';
import { apiRoutes } from './routes';
import type { LucideIcon } from "lucide-react";
import {
  BookOpen, Award, Clock, Target, Library, Lightbulb, BarChart3,
  Trophy, Users, GraduationCap, CreditCard, Settings, Calendar,
  BookMarked, FileText, FolderOpen, Gamepad2, Home, History,
  Sparkles, Star, TrendingUp, Bell, Activity, Shield,
  MessageSquare, Megaphone, Brain,
} from "lucide-react";

export interface NavigationMenuItem {
	id: string;
	href: string;
	label: string;
	description?: string;
	icon?: string;
	badge?: string;
}

export interface NavigationCategory {
	id: string;
	title: string;
	slug: string;
	items: NavigationMenuItem[];
	isPriority?: boolean;
	priorityLabel?: string;
}

export interface NavigationMenu {
	categories: NavigationCategory[];
	updatedAt: string;
}

export interface MainNavItem {
	href: string;
	label: string;
	icon: string;
	description?: string;
	badge?: string;
	megaMenuKey?: string;
}

// Icon name to component mapping
const ICON_MAP: Record<string, LucideIcon> = {
	"book-open": BookOpen, "award": Award, "clock": Clock, "target": Target,
	"library": Library, "lightbulb": Lightbulb, "bar-chart": BarChart3,
	"bar_chart": BarChart3, "trophy": Trophy, "users": Users,
	"graduation-cap": GraduationCap, "graduation_cap": GraduationCap,
	"credit-card": CreditCard, "credit_card": CreditCard,
	"settings": Settings, "calendar": Calendar, "book-marked": BookMarked,
	"book_marked": BookMarked, "file-text": FileText, "file_text": FileText,
	"folder-open": FolderOpen, "folder_open": FolderOpen,
	"gamepad": Gamepad2, "gamepad2": Gamepad2, "home": Home,
	"history": History, "sparkles": Sparkles, "star": Star,
	"trending-up": TrendingUp, "trending_up": TrendingUp,
	"bell": Bell, "shield": Shield, "activity": Activity,
	"message-square": MessageSquare, "message_square": MessageSquare,
	"megaphone": Megaphone, "brain": Brain, "user-plus": Users,
	"user_plus": Users,
};

function iconFromName(name?: string): LucideIcon {
	if (!name) return Sparkles;
	return ICON_MAP[name] || Sparkles;
}

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

export interface MegaMenuCategory {
	id?: string;
	title: string;
	slug?: string;
	items: Array<{
		href: string;
		label: string;
		icon: LucideIcon;
		description?: string;
		badge?: string;
	}>;
	isPriority?: boolean;
	priorityLabel?: string;
}

class NavigationApiService {
	/**
	 * Get the full mega menu navigation structure
	 */
	async getMenu(): Promise<NavigationMenu> {
		return apiClient.get<NavigationMenu>(apiRoutes.navigation.menu);
	}

	/**
	 * Get the main navigation items
	 */
	async getMainNav(): Promise<MainNavItem[]> {
		return apiClient.get<MainNavItem[]>(apiRoutes.navigation.main);
	}

	/**
	 * Fetch navigation with caching
	 */
	async getMenuWithCache(): Promise<BackendNavMenu> {
		const response = await fetch(apiRoutes.navigation.menu, {
			credentials: 'include',
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch navigation menu: ${response.status}`);
		}
		const payload = await response.json() as BackendNavMenu | { success?: boolean; data?: BackendNavMenu };
		// Backend wraps responses in { success, data } envelope. Unwrap if present.
		if (
			payload &&
			typeof payload === 'object' &&
			!Array.isArray(payload) &&
			'success' in payload &&
			'data' in payload
		) {
			return (payload as { success: boolean; data: BackendNavMenu }).data;
		}
		return payload as BackendNavMenu;
	}
}

export const navigationApi = new NavigationApiService();
export default navigationApi;
