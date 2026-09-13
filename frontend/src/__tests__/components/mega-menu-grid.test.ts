import { describe, expect, it } from "vitest";
import { groupMegaMenuCategories } from "@/components/mega-menu/MegaMenuGrid";
import type { MegaMenuCategory } from "@/components/mega-menu/types";

const category = (slug: string, title = slug, columnKey = slug): MegaMenuCategory => ({
	slug,
	title,
	columnKey,
	items: [],
});

describe("groupMegaMenuCategories", () => {
	it("renders every category as its own horizontal column", () => {
		const columns = groupMegaMenuCategories([
			category("study", "study", "study"),
			category("exams", "exams", "study"),
			category("time_management", "time_management", "study"),
			category("digital_library", "digital_library", "resources"),
			category("awareness", "awareness", "resources"),
		]);

		expect(columns.map((column) => column.map(({ slug }) => slug))).toEqual([
			["study"],
			["exams"],
			["time_management"],
			["digital_library"],
			["awareness"],
		]);
	});

	it("keeps school stages beside each other", () => {
		const columns = groupMegaMenuCategories([
			category("primary", "primary", "schools"),
			category("middle", "middle", "schools"),
			category("high_school", "high_school", "schools"),
		]);

		expect(columns).toHaveLength(3);
		expect(columns.every((column) => column.length === 1)).toBeTruthy();
	});

	it("does not split a column when it contains more than eight links", () => {
		const links = Array.from({ length: 12 }, (_, index) => ({
			href: `/schools/${index + 1}`,
			label: `Link ${index + 1}`,
			icon: (() => null) as unknown as MegaMenuCategory["items"][number]["icon"],
		}));
		const columns = groupMegaMenuCategories([
			{ ...category("primary", "Primary", "schools"), items: links },
		]);

		expect(columns).toHaveLength(1);
		expect(columns[0]?.[0]?.items).toHaveLength(12);
	});
});
