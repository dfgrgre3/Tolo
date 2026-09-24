import { Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavItemWithMegaMenu } from "@/components/mega-menu/navData";

// ─── Types ───────────────────────────────────────────────────────

export interface MobileSearchResult {
	href: string;
	label: string;
	icon: LucideIcon;
	badge?: string;
	section?: string;
}

interface ExtraNavSection {
	label: string;
	categories?: NavItemWithMegaMenu["megaMenu"];
}

// ─── Helpers ─────────────────────────────────────────────────────

function createDedupeKey(href: string, label: string): string {
	return `${href}::${label}`;
}

function buildMobileSearchResults(navItems: NavItemWithMegaMenu[]): MobileSearchResult[] {
	const items: MobileSearchResult[] = [];
	const seen = new Set<string>();

	const addItem = (entry: MobileSearchResult) => {
		const key = createDedupeKey(entry.href, entry.label);
		if (seen.has(key)) return;
		seen.add(key);
		items.push(entry);
	};

	// Always add home first
	addItem({ href: "/", label: "الرئيسية", icon: Home });

	for (const item of navItems) {
		addItem({
			href: item.href,
			label: item.label,
			icon: item.icon,
			badge: item.badge,
			section: item.label
		});

		if (item.megaMenu) {
			for (const category of item.megaMenu) {
				for (const subItem of category.items) {
					addItem({
						href: subItem.href,
						label: subItem.label,
						icon: subItem.icon,
						badge: subItem.badge,
						section: item.label
					});
				}
			}
		}
	}

	return items;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * بناء عناصر القائمة الجانبية للموبايل بترتيب الظهور:
 * 1. عناصر الصف الأول (المدارس وميجامنيوها) — تظهر أولاً لأن الديسكتوب
 *    يعرضها في صف مستقل أعلى الهيدر.
 * 2. عناصر التنقل الرئيسية (المزيد / التدريس على Tolo / وظائف Tolo ...).
 * 3. الروابط السريعة الثابتة (التدريس على Tolo / وظائف Tolo) كشبكة أمان
 *    قبل وصول رد الـ API أو عند تعذّره.
 *
 * تُستبعد الرئيسية (موجودة تحت الشعار) ويُمنع تكرار نفس الوجهة أو نفس
 * العنوان، حتى لا يظهر العنصر مرتين إذا أرسله الـ API وأضافه الـ frontend.
 */
export function buildMobileNavItems(
	navItems: NavItemWithMegaMenu[],
	headerNavItems: NavItemWithMegaMenu[] = [],
	quickLinks: NavItemWithMegaMenu[] = []
): NavItemWithMegaMenu[] {
	const seen = new Set<string>();
	const items: NavItemWithMegaMenu[] = [];

	for (const item of [...headerNavItems, ...navItems, ...quickLinks]) {
		if (item.href === "/") continue;

		const dedupeKeys = [createDedupeKey(item.href, item.label), `label::${item.label}`];
		if (dedupeKeys.some((key) => seen.has(key))) continue;

		for (const key of dedupeKeys) seen.add(key);
		items.push(item);
	}

	return items;
}

/**
 * بناء قائمة نتائج البحث للموبايل من عناصر التنقل + أقسام إضافية
 * مع ضمان عدم التكرار
 */
export function buildMobileSearchResultsWithExtras(
	navItems: NavItemWithMegaMenu[],
	extras: ExtraNavSection[] = []
): MobileSearchResult[] {
	const results = buildMobileSearchResults(navItems);
	const seen = new Set(results.map((item) => createDedupeKey(item.href, item.label)));

	for (const extra of extras) {
		if (!extra.categories) continue;

		for (const category of extra.categories) {
			for (const subItem of category.items) {
				const key = createDedupeKey(subItem.href, subItem.label);
				if (seen.has(key)) continue;

				seen.add(key);
				results.push({
					href: subItem.href,
					label: subItem.label,
					icon: subItem.icon,
					badge: subItem.badge,
					section: extra.label
				});
			}
		}
	}

	return results;
}