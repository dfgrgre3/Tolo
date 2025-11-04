"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ensureUser } from "@/lib/user-utils";

type ForumCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  views: number;
  repliesCount: number;
  isPinned: boolean;
};

export default function ForumPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    // Load categories
    const fetchCategories = async () => {
      const res = await fetch("/api/forum/categories");
      const data = await res.json();
      setCategories(data);
    };

    // Load posts
    const fetchPosts = async () => {
      const res = await fetch("/api/forum/posts");
      const data = await res.json();
      setPosts(data);
    };

    fetchCategories();
    fetchPosts();
  }, []);

  const filteredPosts = Array.isArray(posts) ? posts.filter(post => {
    const matchesCategory = activeCategory === "all" || post.categoryId === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) : [];

  // Sort pinned posts first
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="px-4">
      <section className="mx-auto max-w-7xl py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">المنتدى التعليمي</h1>
            <p className="text-muted-foreground">تواصل مع زملائك واطرح أسئلتك</p>
          </div>
          <Link href="/forum/new-post" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            إضافة موضوع جديد
          </Link>
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

        {/* Search */}
        <div className="rounded-lg border p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث في المنتدى..."
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

        {/* Posts */}
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">المواضيع</h2>
          </div>
          <ul className="divide-y">
            {sortedPosts.length > 0 ? (
              sortedPosts.map((post) => (
                <li key={post.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <Link href={`/forum/post/${post.id}`} className="block">
                    <div className="flex items-start gap-3">
                      {post.isPinned && (
                        <span className="text-primary mt-1" title="مثبت">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                            {post.categoryName}
                          </span>
                          <h3 className="font-medium hover:text-primary transition-colors">{post.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>بواسطة: {post.authorName}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{post.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{post.repliesCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="p-8 text-center text-muted-foreground">
                لا توجد مواضيع في هذا التصنيف
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
