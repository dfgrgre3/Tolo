"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";

import { ensureUser } from "@/lib/user-utils";

type BlogCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export default function NewBlogPostPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch("/api/blog/categories");
      const data = await res.json();
      setCategories(data);
      if (Array.isArray(data) && data.length > 0) {
        setCategoryId(data[0].id);
      }
    };

    fetchCategories();
  }, []);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim() || !excerpt.trim() || !content.trim() || !categoryId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          excerpt,
          content,
          categoryId,
          coverImageUrl,
          tags
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        router.push(`/blog/post/${newPost.id}`);
      } else {
        alert("حدث خطأ أثناء إنشاء المقال");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("حدث خطأ أثناء إنشاء المقال");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-primary">المدونة التعليمية</Link>
          <span>/</span>
          <span>مقال جديد</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إنشاء مقال جديد</h1>
          <p className="text-muted-foreground">شارك معرفتك وخبراتك مع الآخرين</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                العنوان
              </label>
              <input
                id="title"
                type="text"
                className="w-full border rounded-md px-3 py-2"
                placeholder="أدخل عنوان المقال..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="excerpt" className="block text-sm font-medium mb-1">
                ملخص المقال
              </label>
              <textarea
                id="excerpt"
                rows={3}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب ملخصاً قصيراً للمقال..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                required
              ></textarea>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">
                التصنيف
              </label>
              <select
                id="category"
                className="w-full border rounded-md px-3 py-2"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {Array.isArray(categories) && categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="coverImageUrl" className="block text-sm font-medium mb-1">
                رابط صورة الغلاف (اختياري)
              </label>
              <input
                id="coverImageUrl"
                type="text"
                className="w-full border rounded-md px-3 py-2"
                placeholder="أدخل رابط صورة الغلاف..."
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-1">
                الوسوم
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="tags"
                  type="text"
                  className="flex-1 border rounded-md px-3 py-2"
                  placeholder="أضف وسماً..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-muted rounded-md"
                  onClick={handleAddTag}
                >
                  إضافة
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                    <span>{tag}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-1">
                المحتوى
              </label>
              <textarea
                id="content"
                rows={12}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب محتوى المقال هنا..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/blog"
              className="px-4 py-2 border rounded-md"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              disabled={isSubmitting || !title.trim() || !excerpt.trim() || !content.trim() || !categoryId}
            >
              {isSubmitting ? "جاري النشر..." : "نشر المقال"}
            </button>
          </div>
        </form>
    </div>
    </Layout>
  );
}
