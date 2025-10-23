"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type Attendee = {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: string;
};

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const eventData = await res.json();
          setEvent(eventData);
        } else {
          // Event not found
          router.push("/events");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        router.push("/events");
      }
    };

    const fetchAttendees = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/attendees`);
        if (res.ok) {
          const attendeesData = await res.json();
          setAttendees(attendeesData);

          // Check if current user is attending
          if (userId) {
            setIsAttending(attendeesData.some((a: Attendee) => a.id === userId));
          }
        }
      } catch (error) {
        console.error("Error fetching attendees:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEvent(), fetchAttendees()]);
      setLoading(false);
    };

    loadData();
  }, [eventId, userId, router]);

  const handleJoinEvent = async () => {
    if (!userId || !event) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setIsAttending(true);

        // Update attendees list
        const newAttendee = {
          id: userId,
          name: "أنت", // In a real app, you'd fetch the user's name
          joinedAt: new Date().toISOString()
        };
        setAttendees([...attendees, newAttendee]);

        // Update event attendees count
        if (event) {
          setEvent({
            ...event,
            currentAttendees: event.currentAttendees + 1
          });
        }
      } else {
        alert("حدث خطأ أثناء الانضمام للمناسبة");
      }
    } catch (error) {
      console.error("Error joining event:", error);
      alert("حدث خطأ أثناء الانضمام للمناسبة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!userId || !event) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attend`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setIsAttending(false);

        // Update attendees list
        setAttendees(attendees.filter(a => a.id !== userId));

        // Update event attendees count
        if (event) {
          setEvent({
            ...event,
            currentAttendees: event.currentAttendees - 1
          });
        }
      } else {
        alert("حدث خطأ أثناء مغادرة المناسبة");
      }
    } catch (error) {
      console.error("Error leaving event:", error);
      alert("حدث خطأ أثناء مغادرة المناسبة");
    } finally {
      setActionLoading(false);
    }
  };

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

  const getCategoryInfo = (categoryId: string) => {
    const categories = [
      { id: "academic", name: "أكاديمي", icon: "🎓" },
      { id: "social", name: "اجتماعي", icon: "👥" },
      { id: "sports", name: "رياضي", icon: "⚽" },
      { id: "cultural", name: "ثقافي", icon: "🎭" },
      { id: "workshop", name: "ورشة عمل", icon: "🛠️" },
    ];

    return categories.find(c => c.id === categoryId) || { id: categoryId, name: categoryId, icon: "📅" };
  };

  if (loading) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">المناسبة غير موجودة</div>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(event.category);

  return (
    <div className="px-4">
      <section className="mx-auto max-w-4xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/events" className="hover:text-primary">الإعلانات والمناسبات</Link>
          <span>/</span>
          <span>{event.title}</span>
        </div>

        {/* Event Header */}
        <div className="rounded-lg border overflow-hidden">
          {event.imageUrl ? (
            <div className="aspect-video bg-muted">
              <img 
                src={event.imageUrl} 
                alt={event.title} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-4xl">{categoryInfo.icon}</span>
            </div>
          )}

          <div className="p-6">
            <div className="mb-4">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                {categoryInfo.icon} {categoryInfo.name}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">{event.title}</h1>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>من: {formatDate(event.startDate)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>إلى: {formatDate(event.endDate)}</span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>الموقع: {event.location}</span>
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

            <div className="flex flex-wrap gap-2 mb-6">
              {event.tags.map((tag, index) => (
                <span key={index} className="bg-muted px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>

            {userId && (
              <div className="mb-6">
                {isAttending ? (
                  <button
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md disabled:opacity-50"
                    onClick={handleLeaveEvent}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "جاري المغادرة..." : "مغادرة المناسبة"}
                  </button>
                ) : (
                  <button
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                    onClick={handleJoinEvent}
                    disabled={actionLoading || (event.maxAttendees ? event.currentAttendees >= event.maxAttendees : false)}
                  >
                    {actionLoading 
                      ? "جاري الانضمام..." 
                      : event.maxAttendees && event.currentAttendees >= event.maxAttendees 
                        ? "وصل الحد الأقصى للمشاركين" 
                        : "الانضمام للمناسبة"
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Event Description */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">وصف المناسبة</h2>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line">{event.description}</div>
          </div>
        </div>

        {/* Attendees */}
        <div className="rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">المشاركون</h2>
            <span className="text-sm text-muted-foreground">
              {event.currentAttendees} مشارك
            </span>
          </div>

          {attendees.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    {attendee.avatar ? (
                      <img 
                        src={attendee.avatar} 
                        alt={attendee.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">{attendee.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-sm text-center truncate w-full">{attendee.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا يوجد مشاركون بعد
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
