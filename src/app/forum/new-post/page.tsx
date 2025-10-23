"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LOCAL_USER_KEY = "tw_user_id";
async function ensureUser(): Promise<string> {
	let id = localStorage.getItem(LOCAL_USER_KEY);
	if (!id) {
		const res = await fetch("/api/users/guest", { method: "POST" });
		const data = await res.json();
		id = data.id;
		localStorage.setItem(LOCAL_USER_KEY, id!);
	}
	return id!;
}

type ForumCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export default function NewPostPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch("/api/forum/categories");
      const data = await res.json();
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].id);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim() || !content.trim() || !categoryId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          content,
          categoryId
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        router.push(`/forum/post/${newPost.id}`);
      } else {
        alert("حدث خطأ أثناء إنشاء الموضوع");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("حدث خطأ أثناء إنشاء الموضوع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4">
      <section className="mx-auto max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/forum" className="hover:text-primary">المنتدى التعليمي</Link>
          <span>/</span>
          <span>موضوع جديد</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إنشاء موضوع جديد</h1>
          <p className="text-muted-foreground">شارك أفكارك واطرح أسئلتك</p>
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
                placeholder="أدخل عنوان الموضوع..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
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
              <label htmlFor="content" className="block text-sm font-medium mb-1">
                المحتوى
              </label>
              <textarea
                id="content"
                rows={8}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب محتوى الموضوع هنا..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/forum"
              className="px-4 py-2 border rounded-md"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              disabled={isSubmitting || !title.trim() || !content.trim() || !categoryId}
            >
              {isSubmitting ? "جاري الإنشاء..." : "نشر الموضوع"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
