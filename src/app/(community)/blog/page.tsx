"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Layout } from "@/components/layout/Layout";

import { ensureUser } from "@/lib/user-utils";

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  coverImageUrl?: string;
  publishedAt: string;
  readTime: number; // in minutes
  views: number;
  tags: string[];
};

type BlogCategory = {
  id: string;
  name: string;
  icon: string;
};

export default function BlogPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    // Load categories
    const fetchCategories = async () => {
      const res = await fetch("/api/blog/categories");
      const data = await res.json() as BlogCategory[];
      setCategories(data);
    };

    // Load posts
    const fetchPosts = async () => {
      const res = await fetch("/api/blog/posts");
      const data = await res.json() as BlogPost[];
      setPosts(data);
    };

    fetchCategories();
    fetchPosts();
  }, []);

  const filteredPosts = Array.isArray(posts) ? posts.filter(post => {
    const matchesCategory = activeCategory === "all" || post.categoryId === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) : [];

  // Sort posts based on selected criteria
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    } else { // popular
      return b.views - a.views;
    }
  });

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">المدونة التعليمية</h1>
            <p className="text-muted-foreground">مقالات ونصائح لتحسين أدائك الأكاديمي</p>
          </div>
          {userId && (
            <Link href="/blog/new-post" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
              إضافة مقال جديد
            </Link>
          )}
        </div>

        {/* Categories */}
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">التصنيفات</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-3 py-1.5 rounded-md text-sm ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              onClick={() => setActiveCategory("all")}
            >
              الكل
            </button>
            {Array.isArray(categories) && categories.map((category) => (
              <button
                key={category.id}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${activeCategory === category.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Sort */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث في المدونة..."
                className="w-full border rounded-md px-4 py-2 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-3 top-2.5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">ترتيب حسب:</span>
              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "popular")}
              >
                <option value="newest">الأحدث</option>
                <option value="popular">الأكثر مشاهدة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {sortedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPosts.map((post) => (
              <div key={post.id} className="rounded-lg border overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="aspect-video bg-muted relative">
                  {post.coverImageUrl ? (
                    <img 
                      src={post.coverImageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-4xl">📝</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {post.categoryName}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">بواسطة: {post.authorName}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{post.readTime} دقيقة</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <Link 
                    href={`/blog/post/${post.id}`} 
                    className="block text-center px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    قراءة المقال
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border p-12 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-medium mb-2">لا توجد مقالات في هذا التصنيف</h3>
            <p className="text-muted-foreground">جرب تغيير التصنيف أو معايير البحث</p>
          </div>
        )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
