"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  readTime: number;
  views: number;
  tags: string[];
};

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/posts/${postId}`);
        if (res.ok) {
          const postData = await res.json();
          setPost(postData);
        } else {
          // Post not found
          router.push("/blog");
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        router.push("/blog");
      }
    };

    const incrementViews = async () => {
      try {
        await fetch(`/api/blog/posts/${postId}/view`, { method: "POST" });
      } catch (error) {
        console.error("Error incrementing views:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await fetchPost();
      await incrementViews();
      setLoading(false);
    };

    loadData();
  }, [postId, router]);

  if (loading) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">المقال غير موجود</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-primary">المدونة التعليمية</Link>
          <span>/</span>
          <span>{post.title}</span>
        </div>

        {/* Post Header */}
        <div className="rounded-lg border overflow-hidden">
          {post.coverImageUrl ? (
            <div className="aspect-video bg-muted">
              <img 
                src={post.coverImageUrl} 
                alt={post.title} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-4xl">📝</span>
            </div>
          )}

          <div className="p-6">
            <div className="mb-4">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                {post.categoryName}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">{post.title}</h1>
            <p className="text-muted-foreground mb-4">{post.excerpt}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <span>بواسطة: {post.authorName}</span>
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{post.readTime} دقيقة قراءة</span>
              </div>
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{post.views} مشاهدة</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <span key={index} className="bg-muted px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="rounded-lg border p-6">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line">{post.content}</div>
          </div>
        </div>

        {/* Related Posts */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">مقالات ذات صلة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Placeholder for related posts */}
            <div className="text-center text-muted-foreground py-8">
              سيتم عرض مقالات ذات صلة قريباً
            </div>
          </div>
        </div>
    </div>
    </Layout>
  );
}
