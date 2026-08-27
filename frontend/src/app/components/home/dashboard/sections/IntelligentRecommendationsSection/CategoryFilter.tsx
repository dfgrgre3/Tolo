"use client";

import React from "react";
import { DASH_TABS } from "../../shared/design-system";

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
}

/** Noon-style pill tab strip for filtering recommendation types. */
export const CategoryFilter = ({ categories, selectedCategory, setSelectedCategory }: CategoryFilterProps) => {
  return (
    <div className={DASH_TABS.list}>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => setSelectedCategory(category.id)}
          aria-pressed={selectedCategory === category.id}
          className={`${DASH_TABS.tab} inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            selectedCategory === category.id ? DASH_TABS.tabActive : DASH_TABS.tabIdle
          }`}
        >
          {category.icon}
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
