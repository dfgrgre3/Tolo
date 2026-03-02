"use client";

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { safeFetch, safeGetItem, safeSetItem } from "@/lib/safe-client-utils";
import { 
  Search,
  FileText,
  BookOpen,
  Users,
  Video,
  Zap,
  TrendingUp,
  Clock,
  X
} from "lucide-react";
import Link from "next/link";

import { logger } from '@/lib/logger';

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
    // Load recent searches from localStorage using safe wrapper
    const stored = safeGetItem("recent_searches", { fallback: null });
    if (stored) {
      try {
        setRecentSearches(Array.isArray(stored) ? stored : JSON.parse(String(stored)));
      } catch {
        // Ignore parse errors
      }
    }

    // Generate suggestions based on query and recent searches
    if (query.length > 1) {
      // Filter recent searches that match the query
      const matchingRecent = recentSearches.filter(s => 
        s.toLowerCase().includes(query.toLowerCase())
      );
      
      // Only show suggestions if we have matching recent searches
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
      // Search in multiple endpoints
      const [coursesData, resourcesData, teachersData] = await Promise.all([
        safeFetch<Course[]>(`/api/courses?search=${encodeURIComponent(searchQuery)}`, undefined, []),
        safeFetch<Resource[]>(`/api/resources?search=${encodeURIComponent(searchQuery)}`, undefined, []),
        safeFetch<Teacher[]>(`/api/teachers?search=${encodeURIComponent(searchQuery)}`, undefined, [])
      ]);

      const results: SearchResult[] = [];

      // Transform courses
      if (coursesData.data) {
        coursesData.data.forEach((course) => {
          results.push({
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

      // Transform resources
      if (resourcesData.data) {
        resourcesData.data.forEach((resource) => {
          results.push({
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

      // Transform teachers
      if (teachersData.data) {
        teachersData.data.forEach((teacher) => {
          results.push({
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

      // Sort by relevance and limit results
      const sortedResults = results
        .filter(r => 
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10);

      setResults(sortedResults);

      // Save to recent searches using safe wrapper
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
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev));
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      course: "دورة",
      resource: "مورد",
      task: "مهمة",
      teacher: "معلم",
      video: "فيديو"
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      course: "bg-blue-100 text-blue-700",
      resource: "bg-green-100 text-green-700",
      task: "bg-purple-100 text-purple-700",
      teacher: "bg-orange-100 text-orange-700",
      video: "bg-red-100 text-red-700"
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 px-6 md:px-12 py-12 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/20 mix-blend-overlay" />
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
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
        </motion.div>

        {/* Search Input */}
        <motion.div
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
              <motion.div
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
                    <span className="flex-1">{suggestion}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !query && (
          <motion.div
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
          </motion.div>
        )}

        {/* Search Results */}
        {isSearching && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && !isSearching && (
            <motion.div
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
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Link href={result.url}>
                    <Card className="bg-black/40 border-white/5 shadow-none hover:bg-white-[0.03] hover:border-white/10 transition-all cursor-pointer rounded-2xl overflow-hidden backdrop-blur-md">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-5">
                          <div className={`rounded-2xl p-3.5 shadow-inner backdrop-blur-md ${getTypeColor(result.type).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')} flex-shrink-0`}>
                            {result.icon}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                              <h3 className="font-bold text-white text-lg truncate">
                                {result.title}
                              </h3>
                              <Badge variant="secondary" className="bg-white/10 text-gray-200 hover:bg-white/20 border-0 whitespace-nowrap">
                                {getTypeLabel(result.type)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                              {result.description}
                            </p>

                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="text-xs border-white/10 text-gray-300">
                                {result.category}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded-md">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>صلة: {result.relevance}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
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

