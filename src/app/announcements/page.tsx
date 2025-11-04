"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ensureUser } from "@/lib/user-utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  publishedAt: string;
  expiresAt?: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  authorName: string;
  tags: string[];
  views: number;
};

type Contest = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  prize?: string;
  category: string;
  organizerName: string;
  tags: string[];
  participantsCount: number;
};

export default function AnnouncementsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [activeTab, setActiveTab] = useState<"announcements" | "contests">("announcements");
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };

    const fetchContests = async () => {
      try {
        const res = await fetch("/api/contests");
        if (res.ok) {
          const data = await res.json();
          setContests(data);
        }
      } catch (error) {
        console.error("Error fetching contests:", error);
      }
    };

    fetchAnnouncements();
    fetchContests();
  }, []);

  useEffect(() => {
    // Filter announcements
    let result = announcements;

    if (activeCategory !== "all") {
      result = result.filter(item => item.category === activeCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(term) || 
        item.content.toLowerCase().includes(term) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort by priority and date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    result = [...result].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    setFilteredAnnouncements(result);
  }, [announcements, activeCategory, searchTerm]);

  useEffect(() => {
    // Filter contests
    let result = contests;

    if (activeCategory !== "all") {
      result = result.filter(item => item.category === activeCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(term) || 
        item.description.toLowerCase().includes(term) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort by date (upcoming first)
    result = [...result].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    setFilteredContests(result);
  }, [contests, activeCategory, searchTerm]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent": return "عاجل";
      case "high": return "عالي";
      case "medium": return "متوسط";
      case "low": return "منخفض";
      default: return priority;
    }
  };

  const categories = [
    { id: "all", name: "الكل", icon: "📢" },
    { id: "academic", name: "أكاديمي", icon: "🎓" },
    { id: "administrative", name: "إداري", icon: "🏢" },
    { id: "events", name: "فعاليات", icon: "🎉" },
    { id: "competitions", name: "مسابقات", icon: "🏆" },
  ];

  return (
    <div className="px-4">
      <section className="mx-auto max-w-7xl py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">الإعلانات والمسابقات</h1>
            <p className="text-muted-foreground">استكشف آخر الإعلانات والمسابقات المتاحة</p>
          </div>
          {userId && (
            <div className="flex gap-2">
              <Link href="/announcements/new" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
                إضافة إعلان
              </Link>
              <Link href="/contests/new" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
                إضافة مسابقة
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="rounded-lg border p-1 flex">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-center ${activeTab === "announcements" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("announcements")}
          >
            الإعلانات
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-center ${activeTab === "contests" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("contests")}
          >
            المسابقات
          </button>
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

        {/* Search */}
        <div className="rounded-lg border p-4">
          <div className="relative">
            <input
              type="text"
              placeholder={`ابحث في ${activeTab === "announcements" ? "الإعلانات" : "المسابقات"}...`}
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

        {/* Content */}
        {activeTab === "announcements" ? (
          // Announcements Grid
          filteredAnnouncements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnnouncements.map((announcement) => (
                <div key={announcement.id} className="rounded-lg border overflow-hidden transition-transform hover:scale-[1.02]">
                  <div className="aspect-video bg-muted relative">
                    {announcement.imageUrl ? (
                      <img 
                        src={announcement.imageUrl} 
                        alt={announcement.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <span className="text-4xl">📢</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(announcement.priority)}`}>
                        {getPriorityText(announcement.priority)}
                      </span>
                      <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {categories.find(c => c.id === announcement.category)?.name || announcement.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{announcement.content}</p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">بواسطة: {announcement.authorName}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(announcement.publishedAt)}</span>
                    </div>

                    {announcement.expiresAt && (
                      <div className="text-xs text-orange-500 mb-3">
                        ينتهي في: {formatDate(announcement.expiresAt)}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mb-3">
                      {announcement.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {announcement.tags.length > 3 && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          +{announcement.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <Link 
                      href={`/announcements/${announcement.id}`} 
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
              <div className="text-5xl mb-4">📢</div>
              <h3 className="text-lg font-medium mb-2">لا توجد إعلانات في هذا التصنيف</h3>
              <p className="text-muted-foreground">جرب تغيير التصنيف أو معايير البحث</p>
            </div>
          )
        ) : (
          // Contests Grid
          filteredContests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContests.map((contest) => (
                <div key={contest.id} className="rounded-lg border overflow-hidden transition-transform hover:scale-[1.02]">
                  <div className="aspect-video bg-muted relative">
                    {contest.imageUrl ? (
                      <img 
                        src={contest.imageUrl} 
                        alt={contest.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
                        <span className="text-4xl">🏆</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {categories.find(c => c.id === contest.category)?.name || contest.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{contest.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{contest.description}</p>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>من: {formatDate(contest.startDate)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>إلى: {formatDate(contest.endDate)}</span>
                      </div>

                      {contest.prize && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>الجائزة: {contest.prize}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{contest.participantsCount} مشارك</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {contest.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {contest.tags.length > 3 && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          +{contest.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <Link 
                      href={`/contests/${contest.id}`} 
                      className="block text-center px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
                    >
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border p-12 text-center">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-lg font-medium mb-2">لا توجد مسابقات في هذا التصنيف</h3>
              <p className="text-muted-foreground">جرب تغيير التصنيف أو معايير البحث</p>
            </div>
          )
        )}
      </section>
    </div>
  );
}
