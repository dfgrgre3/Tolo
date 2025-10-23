"use client";

import { useEffect, useState } from "react";
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

type Event = {
  id: string;
  title: string;
  description: string;
  location?: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  organizerId: string;
  organizerName: string;
  category: string;
  isPublic: boolean;
  maxAttendees?: number;
  currentAttendees: number;
  tags: string[];
};

export default function EventsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "soonest">("newest");

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    let result = events;

    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter(event => event.category === activeCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(event => 
        event.title.toLowerCase().includes(term) || 
        event.description.toLowerCase().includes(term) ||
        event.location?.toLowerCase().includes(term) ||
        event.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort
    if (sortBy === "newest") {
      result = [...result].sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    } else { // soonest
      result = [...result].sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    }

    setFilteredEvents(result);
  }, [events, activeCategory, searchTerm, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const categories = [
    { id: "all", name: "الكل", icon: "📅" },
    { id: "academic", name: "أكاديمي", icon: "🎓" },
    { id: "social", name: "اجتماعي", icon: "👥" },
    { id: "sports", name: "رياضي", icon: "⚽" },
    { id: "cultural", name: "ثقافي", icon: "🎭" },
    { id: "workshop", name: "ورشة عمل", icon: "🛠️" },
  ];

  return (
    <div className="px-4">
      <section className="mx-auto max-w-7xl py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">الإعلانات والمناسبات</h1>
            <p className="text-muted-foreground">استكشف الفعاليات والمناسبات القادمة</p>
          </div>
          {userId && (
            <Link href="/events/new" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
              إنشاء مناسبة جديدة
            </Link>
          )}
        </div>

        {/* Categories */}
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">التصنيفات</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
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
                placeholder="ابحث في المناسبات..."
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
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">الأحدث</option>
                <option value="soonest">الأقرب</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-lg border overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="aspect-video bg-muted relative">
                  {event.imageUrl ? (
                    <img 
                      src={event.imageUrl} 
                      alt={event.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-4xl">📅</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {categories.find(c => c.id === event.category)?.name || event.category}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">{event.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{event.description}</p>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(event.startDate)}</span>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>المنظم: {event.organizerName}</span>
                    </div>

                    {event.maxAttendees && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{event.currentAttendees} من {event.maxAttendees} مشارك</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {event.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {event.tags.length > 3 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        +{event.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <Link 
                    href={`/events/${event.id}`} 
                    className="block text-center px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    عرض التفاصيل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-medium mb-2">لا توجد مناسبات في هذا التصنيف</h3>
            <p className="text-muted-foreground">جرب تغيير التصنيف أو معايير البحث</p>
          </div>
        )}
      </section>
    </div>
  );
}
