"use client";

import React from "react";

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

export const CategoryFilter = ({ categories, selectedCategory, setSelectedCategory }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-300 ${
            selectedCategory === category.id
              ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-105"
              : "bg-white/5 text-gray-400 border-white/10 hover:border-primary/50 hover:bg-white/10"
          }`}
        >
          {category.icon}
          <span className="font-bold text-sm tracking-wide">{category.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
