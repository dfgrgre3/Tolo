import { describe, expect, it } from "vitest";
import { buildMobileNavItems, buildMobileSearchResultsWithExtras } from "@/components/header/headerMenuUtils";
import { getNavigationIcon } from "@/components/mega-menu/navigationIconMapper";
import {
	headerNavItems,
	mobileQuickNavItems,
	type NavItemWithMegaMenu,
} from "@/components/mega-menu/navData";

const item = (
	href: string,
	label: string,
	extra: Partial<NavItemWithMegaMenu> = {}
): NavItemWithMegaMenu => ({
	href,
	label,
	icon: getNavigationIcon("sparkles"),
	...extra,
});

// القائمة الجانبية للهاتف تُبنى من عناصر الصف الأول (المدارس وميجامنيوها) ثم
// عناصر التنقل ثم الروابط السريعة، ويجب أن تظهر هذه الوجهات الثلاث فيها.
describe("buildMobileNavItems", () => {
	it("يضع المدارس وميجامنيوها في مقدمة القائمة الجانبية", () => {
		const items = buildMobileNavItems([item("/courses", "الدورات")], headerNavItems);

		expect(items[0]?.href).toBe("/schools");
		expect(items[0]?.label).toBe("مدارس");
		expect(items[0]?.megaMenu).toHaveLength(3);
		expect(items.map((entry) => entry.href)).toEqual([
			"/schools",
			"/courses",
		]);
	});

	it("يضيف التدريس على Tolo ووظائف Tolo في نهاية القائمة", () => {
		const items = buildMobileNavItems([item("/all-features", "المزيد")], headerNavItems, mobileQuickNavItems);

		expect(items.map((entry) => entry.label)).toEqual([
			"مدارس",
			"المزيد",
			"التدريس على Tolo",
			"وظائف Tolo",
		]);
		expect(items.at(-1)?.href).toBe("/jobs");
	});

	it("يستبعد الصفحة الرئيسية لأنها موجودة تحت الشعار", () => {
		const items = buildMobileNavItems([item("/", "الرئيسية"), item("/courses", "الدورات")]);

		expect(items.map((entry) => entry.href)).toEqual(["/courses"]);
	});

	it("لا يكرر الوجهة أو العنوان عند وصولها من الـ API ومن الروابط السريعة", () => {
		const items = buildMobileNavItems(
			[item("/jobs", "وظائف Tolo"), item("/teaching", "التدريس على Tolo")],
			[],
			mobileQuickNavItems
		);

		// /jobs و /teach قادمان أيضاً من الروابط السريعة، ويجب ألا يظهرا مرتين.
		expect(items.map((entry) => entry.href)).toEqual(["/jobs", "/teaching"]);
	});

	it("يجعل نتائج البحث تشمل المدارس والمراحل والروابط السريعة", () => {
		const results = buildMobileSearchResultsWithExtras(
			buildMobileNavItems([item("/courses", "الدورات")], headerNavItems, mobileQuickNavItems)
		);
		const hrefs = results.map((entry) => entry.href);

		expect(hrefs).toContain("/schools");
		expect(hrefs).toContain("/schools/primary/4");
		expect(hrefs).toContain("/schools/secondary/3");
		expect(hrefs).toContain("/teach");
		expect(hrefs).toContain("/jobs");
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});
});

describe("mobileQuickNavItems", () => {
	it("يحتوي التدريس على Tolo ووظائف Tolo فقط من روابط الصف الأول", () => {
		expect(mobileQuickNavItems.map((entry) => [entry.href, entry.label])).toEqual([
			["/teach", "التدريس على Tolo"],
			["/jobs", "وظائف Tolo"],
		]);
	});
});