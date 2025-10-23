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

export default function NewEventPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("academic");
  const [isPublic, setIsPublic] = useState(true);
  const [maxAttendees, setMaxAttendees] = useState<number | "">("");
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
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          description,
          location,
          startDate,
          endDate,
          imageUrl,
          category,
          isPublic,
          maxAttendees: maxAttendees === "" ? null : maxAttendees,
          tags
        }),
      });

      if (res.ok) {
        const newEvent = await res.json();
        router.push(`/events/${newEvent.id}`);
      } else {
        alert("حدث خطأ أثناء إنشاء المناسبة");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("حدث خطأ أثناء إنشاء المناسبة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: "academic", name: "أكاديمي", icon: "🎓" },
    { id: "social", name: "اجتماعي", icon: "👥" },
    { id: "sports", name: "رياضي", icon: "⚽" },
    { id: "cultural", name: "ثقافي", icon: "🎭" },
    { id: "workshop", name: "ورشة عمل", icon: "🛠️" },
  ];

  return (
    <div className="px-4">
      <section className="mx-auto max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/events" className="hover:text-primary">الإعلانات والمناسبات</Link>
          <span>/</span>
          <span>مناسبة جديدة</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إنشاء مناسبة جديدة</h1>
          <p className="text-muted-foreground">شارك الآخرين بالفعاليات والمناسبات القادمة</p>
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
                placeholder="أدخل عنوان المناسبة..."
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
                rows={4}
                className="w-full border rounded-md px-3 py-2"
                placeholder="اكتب وصفاً للمناسبة..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                الموقع (اختياري)
              </label>
              <input
                id="location"
                type="text"
                className="w-full border rounded-md px-3 py-2"
                placeholder="أدخل موقع المناسبة..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                  تاريخ البدء
                </label>
                <input
                  id="startDate"
                  type="datetime-local"
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
                  type="datetime-local"
                  className="w-full border rounded-md px-3 py-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxAttendees" className="block text-sm font-medium mb-1">
                  الحد الأقصى للمشاركين (اختياري)
                </label>
                <input
                  id="maxAttendees"
                  type="number"
                  min="1"
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="أدخل الحد الأقصى للمشاركين..."
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value ? parseInt(e.target.value) : "")}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="isPublic"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <label htmlFor="isPublic" className="text-sm font-medium">
                  مناسبة عامة
                </label>
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
              href="/events"
              className="px-4 py-2 border rounded-md"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              disabled={isSubmitting || !title.trim() || !description.trim() || !startDate || !endDate}
            >
              {isSubmitting ? "جاري الإنشاء..." : "إنشاء المناسبة"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
