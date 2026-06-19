"use client";

import { useState, useEffect, useRef, memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { safeFetch, safeGetItem, safeSetItem } from "@/lib/safe-client-utils";
import {
  Search,
  FileText,
  BookOpen,
  Users,
  Video,
  Clock
} from "lucide-react";
import { logger } from '@/lib/logger';
import { SearchInput } from "./SearchInput";
import { SearchResultCard } from "./SearchResultCard";

interface SearchResult {
  id: string;
  type: "course" | "resource" | "task" | "teacher" | "video";
  title: string;
  description: string;
  category: string;
  relevance: number;
  url: string;
  icon: React.ReactNode;
}

interface Course {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  subject?: string;
}

interface Resource {
  id: string;
  type: string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  subject?: string;
}

interface Teacher {
  id: string;
  name?: string;
  subject?: string;
  bio?: string;
  description?: string;
}

export const AdvancedSearchSection = memo(function AdvancedSearchSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = safeGetItem("recent_searches", { fallback: null });
    if (stored) {
      try {
        setRecentSearches(Array.isArray(stored) ? stored : JSON.parse(String(stored)));
      } catch {
        // Ignore parse errors
      }
    }

    if (query.length > 1) {
      const matchingRecent = recentSearches.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(matchingRecent.slice(0, 5));
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const [coursesData, resourcesData, teachersData] = await Promise.all([
        safeFetch<Course[]>(`/api/courses?search=${encodeURIComponent(searchQuery)}`, undefined, []),
        safeFetch<Resource[]>(`/api/resources?search=${encodeURIComponent(searchQuery)}`, undefined, []),
        safeFetch<Teacher[]>(`/api/teachers?search=${encodeURIComponent(searchQuery)}`, undefined, [])
      ]);

      const resultsList: SearchResult[] = [];

      if (coursesData.data) {
        coursesData.data.forEach((course) => {
          resultsList.push({
            id: `course-${course.id}`,
            type: "course",
            title: course.title || course.name || "دورة بدون عنوان",
            description: course.description || "",
            category: course.category || course.subject || "عام",
            relevance: 95,
            url: `/courses/${course.id}`,
            icon: <BookOpen className="h-5 w-5" />
          });
        });
      }

      if (resourcesData.data) {
        resourcesData.data.forEach((resource) => {
          resultsList.push({
            id: `resource-${resource.id}`,
            type: resource.type === "video" ? "video" : "resource",
            title: resource.title || resource.name || "مورد بدون عنوان",
            description: resource.description || "",
            category: resource.category || resource.subject || "عام",
            relevance: 88,
            url: `/resources/${resource.id}`,
            icon: resource.type === "video" ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />
          });
        });
      }

      if (teachersData.data) {
        teachersData.data.forEach((teacher) => {
          resultsList.push({
            id: `teacher-${teacher.id}`,
            type: "teacher",
            title: `${teacher.name || "معلم"} - ${teacher.subject || "عام"}`,
            description: teacher.bio || teacher.description || `معلم متخصص في ${teacher.subject || "المواد الدراسية"}`,
            category: teacher.subject || "عام",
            relevance: 75,
            url: `/teachers/${teacher.id}`,
            icon: <Users className="h-5 w-5" />
          });
        });
      }

      const sortedResults = resultsList
        .filter((r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10);

      setResults(sortedResults);

      if (searchQuery && !recentSearches.includes(searchQuery)) {
        const updated = [searchQuery, ...recentSearches.slice(0, 4)];
        setRecentSearches(updated);
        safeSetItem("recent_searches", updated);
      }
    } catch (error) {
      logger.error("Error performing search:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => prev > -1 ? prev - 1 : prev);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        performSearch(query);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSuggestions([]);
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 px-6 md:px-12 py-12 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/20 mix-blend-overlay" />
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 p-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Search className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              بحث المحتوى المتقدم
            </h2>
          </div>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            ابحث في الدورات، الموارد، المعلمين والمزيد باستخدام الذكاء الاصطناعي
          </p>
        </m.div>

        {/* Search Input Component */}
        <SearchInput
          query={query}
          setQuery={setQuery}
          handleSearch={handleSearch}
          handleKeyDown={handleKeyDown}
          clearSearch={clearSearch}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          handleSuggestionClick={handleSuggestionClick}
        />

        {/* Recent Searches */}
        {recentSearches.length > 0 && !query && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <p className="text-sm font-medium text-muted-foreground mb-3">البحث الأخير:</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-300"
                  onClick={() => handleSuggestionClick(search)}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {search}
                </Badge>
              ))}
            </div>
          </m.div>
        )}

        {/* Search Results */}
        {isSearching && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && !isSearching && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">
                  تم العثور على {results.length} نتيجة
                </p>
              </div>

              {results.map((result, index) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  index={index}
                />
              ))}
            </m.div>
          )}
        </AnimatePresence>

        {query && !isSearching && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لم يتم العثور على نتائج</p>
            <p className="text-sm text-muted-foreground mt-2">جرب مصطلحات بحث مختلفة</p>
          </div>
        )}
      </div>
    </section>
  );
});

export default AdvancedSearchSection;
