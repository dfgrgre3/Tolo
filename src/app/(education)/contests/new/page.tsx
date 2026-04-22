"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ensureUser } from "@/lib/user-utils";

import { logger } from '@/lib/logger';

export default function NewContestPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prize, setPrize] = useState("");
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
    if (!userId || !title.trim() || !description.trim() || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          description,
          imageUrl,
          startDate,
          endDate,
          prize: prize || null,
          category,
          tags
        }),
      });

      if (res.ok) {
        const newContest = await res.json();
        router.push(`/contests/${newContest.id}`);
      } else {
        alert("حدث خطأ أثناء إنشاء المسابقة");
      }
    } catch (error) {
      logger.error("Error creating contest:", error);
      alert("حدث خطأ أثناء إنشاء المسابقة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: "academic", name: "أكاديمي", icon: "ًںژ“" },
    { id: "scientific", name: "علمي", icon: "ًں”¬" },
    { id: "literary", name: "أدبي", icon: "ًں“ڑ" },
    { id: "artistic", name: "فني", icon: "ًںژ¨" },
    { id: "technical", name: "تقني", icon: "ًں’»" },
  ];

  return (
          <div className="px-4">
        <section className="mx-auto max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/announcements" className="hover:text-primary">الإعلانات والمسابقات</Link>
          <span>/</span>
          <span>مسابقة جديدة</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إنشاء مسابقة جديدة</h1>
          <p className="text-muted-foreground">نظم مسابقة وتحفيز الطلاب على المشاركة</p>
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
                placeholder="أدخل عنوان المسابقة..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                الوصف
              </label>
              <textarea
                id="description"
                rows={6}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب وصفاً للمسابقة..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                  تاريخ البدء
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                  تاريخ الانتهاء
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label htmlFor="prize" className="block text-sm font-medium mb-1">
                  الجائزة (اختياري)
                </label>
                <input
                  id="prize"
                  type="text"
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="أدخل وصف الجائزة..."
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                />
              </div>
            </div>

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
                      أ—
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
              disabled={isSubmitting || !title.trim() || !description.trim() || !startDate || !endDate}
            >
              {isSubmitting ? "جاري الإنشاء..." : "إنشاء المسابقة"}
            </button>
          </div>
        </form>
        </section>
      </div>
      );
}
