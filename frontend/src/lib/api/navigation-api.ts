import { apiClient } from './api-client';
import { apiRoutes } from './routes';
import { z } from 'zod';
import { repairMojibake } from '@/lib/i18n/repair-mojibake';

const legacyMenuKeyBySlug: Record<string, "all-features" | "schools"> = {
	primary: "schools",
	middle: "schools",
	high_school: "schools",
};

const navigationMenuPayloadSchema = z.object({
	schemaVersion: z.literal(1),
	menus: z.array(z.object({
		key: z.string(),
		href: z.string(),
		label: z.string(),
		description: z.string().optional(),
		icon: z.string().optional(),
		badge: z.string().optional(),
		order: z.number().optional(),
	})),
	categories: z.array(z.object({
		id: z.string(),
		title: z.string(),
		slug: z.string(),
		menuKey: z.enum(["all-features", "schools"]),
		columnKey: z.string().optional(),
		items: z.array(z.object({
			id: z.string(),
			href: z.string(),
			label: z.string(),
			description: z.string().optional(),
			icon: z.string().optional(),
			badge: z.string().optional(),
		})),
		isPriority: z.boolean().optional(),
		priorityLabel: z.string().optional(),
	})),
	updatedAt: z.string().datetime({ offset: true }),
});

// Older backend responses omitted the version and menu grouping metadata.
export const navigationMenuSchema = z.preprocess((payload) => {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

	const menu = payload as { schemaVersion?: unknown; menus?: unknown; categories?: unknown };
	if (!Array.isArray(menu.categories)) return payload;
	const text = (value: unknown) => typeof value === 'string' ? repairMojibake(value) : value;
	const normalizeItem = (item: unknown) => {
		if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
		const entry = item as Record<string, unknown>;
		return {
			...entry,
			label: text(entry.label),
			description: text(entry.description),
			badge: text(entry.badge),
		};
	};

	return {
		...menu,
		schemaVersion: menu.schemaVersion ?? 1,
		menus: Array.isArray(menu.menus) ? menu.menus.map(normalizeItem) : [],
		categories: menu.categories.map((category) => {
			if (!category || typeof category !== "object" || Array.isArray(category)) return category;

			const entry = category as { slug?: unknown; menuKey?: unknown; title?: unknown; priorityLabel?: unknown; items?: unknown };
			return {
				...entry,
				title: text(entry.title),
				priorityLabel: text(entry.priorityLabel),
				items: Array.isArray(entry.items) ? entry.items.map(normalizeItem) : entry.items,
				menuKey: entry.menuKey ?? (
					typeof entry.slug === "string"
						? legacyMenuKeyBySlug[entry.slug] ?? "all-features"
						: undefined
				),
			};
		}),
	};
}, navigationMenuPayloadSchema);

export type BackendNavItem = z.infer<typeof navigationMenuSchema>["categories"][number]["items"][number];
export type BackendNavCategory = z.infer<typeof navigationMenuSchema>["categories"][number];
export type BackendNavMenuEntry = z.infer<typeof navigationMenuSchema>["menus"][number];
export type BackendNavMenu = z.infer<typeof navigationMenuSchema>;

class NavigationApiService {
	/**
	 * Get the full mega menu navigation structure
	 */
	async getMenu(): Promise<BackendNavMenu> {
		const payload = await apiClient.get<unknown>(apiRoutes.navigation.menu);
		return navigationMenuSchema.parse(payload);
	}

}

export const navigationApi = new NavigationApiService();
export default navigationApi;
