"use client";

import React from "react";
import { m, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search, Zap, X } from "lucide-react";

interface SearchInputProps {
  query: string;
  setQuery: (val: string) => void;
  handleSearch: (val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  clearSearch: () => void;
  suggestions: string[];
  selectedIndex: number;
  handleSuggestionClick: (suggestion: string) => void;
}

export const SearchInput = ({
  query,
  setQuery,
  handleSearch,
  handleKeyDown,
  clearSearch,
  suggestions,
  selectedIndex,
  handleSuggestionClick
}: SearchInputProps) => {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      className="relative mb-6"
    >
      <div className="relative group">
        <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-primary transition-colors" />
        <Input
          type="text"
          placeholder="ابحث عن دورات، موارد، معلمين..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="pr-16 pl-4 py-8 text-xl bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl shadow-inner backdrop-blur-sm transition-all"
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="مسح البحث"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-right px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 ${index === selectedIndex ? 'bg-slate-50' : ''}`}
              >
                <Zap className="h-4 w-4 text-emerald-600" />
                <span className="flex-1 text-slate-800 font-medium">{suggestion}</span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default SearchInput;
