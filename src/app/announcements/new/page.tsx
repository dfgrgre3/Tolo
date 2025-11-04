"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ensureUser } from "@/lib/user-utils";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [category, setCategory] = useState("academic");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ensureUser().then(setUserId);
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
    if (!userId || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          content,
          imageUrl,
          expiresAt: expiresAt || null,
          priority,
          category,
          tags
        }),
      });

      if (res.ok) {
        const newAnnouncement = await res.json();
        router.push(`/announcements/${newAnnouncement.id}`);
      } else {
        alert("حدث خطأ أثناء إنشاء الإعلان");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      alert("حدث خطأ أثناء إنشاء الإعلان");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: "academic", name: "أكاديمي", icon: "🎓" },
    { id: "administrative", name: "إداري", icon: "🏢" },
    { id: "events", name: "فعاليات", icon: "🎉" },
    { id: "competitions", name: "مسابقات", icon: "🏆" },
  ];

  const priorities = [
    { id: "low", name: "منخفض", color: "bg-green-500" },
    { id: "medium", name: "متوسط", color: "bg-yellow-500" },
    { id: "high", name: "عالي", color: "bg-orange-500" },
    { id: "urgent", name: "عاجل", color: "bg-red-500" },
  ];

  return (
    <div className="px-4">
      <section className="mx-auto max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/announcements" className="hover:text-primary">الإعلانات والمسابقات</Link>
          <span>/</span>
          <span>إعلان جديد</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إنشاء إعلان جديد</h1>
          <p className="text-muted-foreground">شارك الآخرين بالإعلانات الهامة</p>
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
                placeholder="أدخل عنوان الإعلان..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-1">
                المحتوى
              </label>
              <textarea
                id="content"
                rows={6}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب محتوى الإعلان..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-1">
                  الأولوية
                </label>
                <select
                  id="priority"
                  className="w-full border rounded-md px-3 py-2"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  required
                >
                  {priorities.map((prio) => (
                    <option key={prio.id} value={prio.id}>
                      {prio.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1">
                  التصنيف
                </label>
                <select
                  id="category"
                  className="w-full border rounded-md px-3 py-2"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
                  رابط الصورة (اختياري)
                </label>
                <input
                  id="imageUrl"
                  type="text"
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="أدخل رابط الصورة..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="expiresAt" className="block text-sm font-medium mb-1">
                  تاريخ الانتهاء (اختياري)
                </label>
                <input
                  id="expiresAt"
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
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
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/announcements"
              className="px-4 py-2 border rounded-md"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? "جاري النشر..." : "نشر الإعلان"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
