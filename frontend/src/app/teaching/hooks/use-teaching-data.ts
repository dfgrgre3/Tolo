"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";

// ==========================================
// TYPES DEFINITIONS
// ==========================================

export interface InstructorStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  enrollmentsCount: number;
  totalRevenue: number;
  monthlyRevenue: number;
  completionRate: number;
  averageRating: number;
  totalHours: number;
  certificatesIssued: number;
  unreadMessages: number;
  pendingReviews: number;
}

export interface ActivityLog {
  id: string;
  type: "enrollment" | "review" | "submission" | "system";
  messageAr: string;
  messageEn: string;
  time: string;
  studentName?: string;
  courseTitle?: string;
  rating?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  status: "published" | "draft" | "archived";
  studentsCount: number;
  lessonsCount: number;
  rating: number;
  price: number;
  duration: string;
  category: string;
  createdDate: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "pdf" | "quiz" | "assignment";
  url?: string;
  isPreview?: boolean;
}

export interface Student {
  id: string;
  name: string;
  avatar: string;
  email: string;
  courseProgress: {
    courseId: string;
    courseTitle: string;
    progressPercent: number;
    lastActive: string;
  }[];
  joinDate: string;
}

export interface Review {
  id: string;
  studentName: string;
  studentAvatar: string;
  courseTitle: string;
  rating: number;
  comment: string;
  date: string;
  replies: {
    id: string;
    author: string;
    text: string;
    date: string;
  }[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  messages: Message[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: "class" | "exam" | "meeting" | "deadline";
  duration: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "system" | "course" | "review" | "payment" | "message";
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  type: "payout" | "sale";
  courseTitle?: string;
}

// ==========================================
// MOCK DATA INITIALIZATION
// ==========================================

const mockStats: InstructorStats = {
  totalCourses: 12,
  publishedCourses: 8,
  draftCourses: 4,
  totalStudents: 1420,
  enrollmentsCount: 1840,
  totalRevenue: 12450,
  monthlyRevenue: 3420,
  completionRate: 74,
  averageRating: 4.8,
  totalHours: 320,
  certificatesIssued: 450,
  unreadMessages: 3,
  pendingReviews: 5,
};

const mockActivities: ActivityLog[] = [
  { id: "1", type: "enrollment", studentName: "أحمد علي", courseTitle: "أساسيات لغة TypeScript للمبتدئين", messageAr: "سجل أحمد علي في كورس أساسيات لغة TypeScript للمبتدئين", messageEn: "Ahmed Ali enrolled in TypeScript Basics", time: "قبل 5 دقائق" },
  { id: "2", type: "review", studentName: "محمد عمر", courseTitle: "تطوير واجهات المستخدم باستخدام React", rating: 5, messageAr: "أضاف محمد عمر تقييماً بـ 5 نجوم لكورس React", messageEn: "Mohamed Omar rated React Course 5 stars", time: "قبل ساعة" },
  { id: "3", type: "submission", studentName: "سارة خالد", courseTitle: "تصميم واجهات الويب باستخدام Tailwind CSS", messageAr: "سلمت سارة خالد الواجب الأول لكورس Tailwind CSS", messageEn: "Sara Khaled submitted Assignment 1 for Tailwind CSS", time: "قبل ساعتين" },
  { id: "4", type: "enrollment", studentName: "هدى محمود", courseTitle: "أساسيات لغة TypeScript للمبتدئين", messageAr: "سجلت هدى محمود في كورس أساسيات لغة TypeScript", messageEn: "Hoda Mahmoud enrolled in TypeScript Basics", time: "قبل 4 ساعات" }
];

const mockCourses: Course[] = [
  {
    id: "1",
    title: "أساسيات لغة TypeScript للمبتدئين",
    description: "تعلم أساسيات لغة TypeScript وكيفية دمجها مع بيئة عمل JavaScript لتطوير تطبيقات خالية من الأخطاء.",
    thumbnail: "https://images.unsplash.com/photo-1516116211223-5c359a36298a?w=500&auto=format&fit=crop&q=60",
    status: "published",
    studentsCount: 450,
    lessonsCount: 15,
    rating: 4.8,
    price: 49,
    duration: "12 ساعة",
    category: "البرمجة والتطوير",
    createdDate: "2026-01-10",
    chapters: [
      {
        id: "c1",
        title: "المقدمة والتهيئة",
        lessons: [
          { id: "l1", title: "مقدمة عن الدورة والمدرب", duration: "10 دقائق", type: "video", isPreview: true },
          { id: "l2", title: "تثبيت الأدوات وتهيئة بيئة العمل", duration: "15 دقيقة", type: "video" }
        ]
      },
      {
        id: "c2",
        title: "أساسيات الأنواع (Types)",
        lessons: [
          { id: "l3", title: "فهم الأنواع الأساسية Primitive Types", duration: "20 دقيقة", type: "video" },
          { id: "l4", title: "اختبار سريع: الأنواع الأساسية", duration: "10 دقائق", type: "quiz" }
        ]
      }
    ]
  },
  {
    id: "2",
    title: "تطوير واجهات المستخدم باستخدام React",
    description: "احترف بناء مكونات تفاعلية وواجهات مستخدم متطورة باستخدام React 19 والأنماط الحديثة.",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&auto=format&fit=crop&q=60",
    status: "published",
    studentsCount: 620,
    lessonsCount: 22,
    rating: 4.9,
    price: 89,
    duration: "24 ساعة",
    category: "البرمجة والتطوير",
    createdDate: "2026-02-15",
    chapters: []
  },
  {
    id: "3",
    title: "تصميم واجهات الويب باستخدام Tailwind CSS",
    description: "طوّر واجهات ويب متجاوبة وجذابة بأسلوب حديث وسرعة فائقة باستخدام إطار العمل Tailwind CSS.",
    thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&auto=format&fit=crop&q=60",
    status: "draft",
    studentsCount: 0,
    lessonsCount: 8,
    rating: 0,
    price: 29,
    duration: "6 ساعات",
    category: "التصميم والواجهات",
    createdDate: "2026-06-01",
    chapters: []
  }
];

const mockStudents: Student[] = [
  {
    id: "s1",
    name: "أحمد علي",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed",
    email: "ahmed.ali@example.com",
    courseProgress: [
      { courseId: "1", courseTitle: "أساسيات لغة TypeScript للمبتدئين", progressPercent: 80, lastActive: "قبل 5 دقائق" },
      { courseId: "2", courseTitle: "تطوير واجهات المستخدم باستخدام React", progressPercent: 45, lastActive: "أمس" }
    ],
    joinDate: "2026-02-01"
  },
  {
    id: "s2",
    name: "سارة خالد",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    email: "sara.khaled@example.com",
    courseProgress: [
      { courseId: "1", courseTitle: "أساسيات لغة TypeScript للمبتدئين", progressPercent: 100, lastActive: "قبل ساعتين" }
    ],
    joinDate: "2026-03-10"
  },
  {
    id: "s3",
    name: "محمد عمر",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mohamed",
    email: "mohamed.omar@example.com",
    courseProgress: [
      { courseId: "2", courseTitle: "تطوير واجهات المستخدم باستخدام React", progressPercent: 12, lastActive: "قبل ساعة" }
    ],
    joinDate: "2026-04-12"
  }
];

const mockReviews: Review[] = [
  {
    id: "r1",
    studentName: "محمد عمر",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mohamed",
    courseTitle: "تطوير واجهات المستخدم باستخدام React",
    rating: 5,
    comment: "الشرح ممتاز ومبسط جداً، الكورس يغطي مفاهيم حديثة ساعدتني كثيراً في عملي.",
    date: "2026-06-25",
    replies: [
      { id: "rep1", author: "المدرب", text: "شكراً لك يا محمد، هذا يسعدني جداً! تمنياتي لك بالتوفيق الدائم.", date: "2026-06-26" }
    ]
  },
  {
    id: "r2",
    studentName: "سارة خالد",
    studentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    courseTitle: "أساسيات لغة TypeScript للمبتدئين",
    rating: 4,
    comment: "الدورة مفيدة والتمارين ممتازة، ولكن تمنيت لو كان هناك شرح إضافي لـ Generics بشكل أعمق.",
    date: "2026-06-20",
    replies: []
  }
];

const mockConversations: Conversation[] = [
  {
    id: "c1",
    participantName: "أحمد علي",
    participantAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed",
    lastMessage: "هل يمكنك شرح الجزء الخاص بـ generic interfaces مرة أخرى؟",
    time: "قبل 15 دقيقة",
    unreadCount: 1,
    messages: [
      { id: "m1", senderId: "s1", senderName: "أحمد علي", senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed", text: "مرحباً يا أستاذ، واجهت مشكلة في فهم الـ Generics.", time: "10:30 ص", isMe: false },
      { id: "m2", senderId: "me", senderName: "المدرب", senderAvatar: "", text: "أهلاً بك يا أحمد، ما هي النقطة غير الواضحة تحديداً؟", time: "10:32 ص", isMe: true },
      { id: "m3", senderId: "s1", senderName: "أحمد علي", senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed", text: "هل يمكنك شرح الجزء الخاص بـ generic interfaces مرة أخرى؟", time: "10:45 ص", isMe: false }
    ]
  },
  {
    id: "c2",
    participantName: "سارة خالد",
    participantAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    lastMessage: "شكراً جزيلاً لك، تم حل المشكلة بعد مراجعة الكود.",
    time: "قبل ساعتين",
    unreadCount: 0,
    messages: [
      { id: "m4", senderId: "s2", senderName: "سارة خالد", senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara", text: "مرحباً أستاذ، كود الـ React لا يعمل ويظهر خطأ في الـ state.", time: "أمس", isMe: false },
      { id: "m5", senderId: "me", senderName: "المدرب", senderAvatar: "", text: "تأكدي من تصدير المكون بشكل صحيح وتمرير الـ initial state.", time: "أمس", isMe: true },
      { id: "m6", senderId: "s2", senderName: "سارة خالد", senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara", text: "شكراً جزيلاً لك، تم حل المشكلة بعد مراجعة الكود.", time: "9:00 ص", isMe: false }
    ]
  }
];

const mockEvents: CalendarEvent[] = [
  { id: "e1", title: "بث مباشر: مراجعة مشروع React والرد على الأسئلة", date: new Date().toISOString().split("T")[0]!, time: "18:00", type: "class", duration: "ساعة ونصف" },
  { id: "e2", title: "تسليم مشروع TypeScript النهائي", date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]!, time: "23:59", type: "deadline", duration: "" },
  { id: "e3", title: "اجتماع مع إدارة المنصة لمناقشة الخطة الجديدة", date: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0]!, time: "14:00", type: "meeting", duration: "ساعة واحدة" }
];

const mockNotifications: NotificationItem[] = [
  { id: "n1", title: "تقييم جديد", body: "ترك الطالب محمد عمر تقييماً بـ 5 نجوم في كورس React", time: "قبل ساعة", read: false, type: "review" },
  { id: "n2", title: "تسجيل جديد", body: "سجل أحمد علي في كورس أساسيات TypeScript", time: "قبل 15 دقيقة", read: false, type: "course" },
  { id: "n3", title: "تسلم الدفعة الشهرية", body: "تم إرسال أرباح شهر يونيو إلى حسابك المصرفي بنجاح", time: "أمس", read: true, type: "payment" }
];

const mockTransactions: Transaction[] = [
  { id: "t1", amount: 49, date: "2026-07-04", status: "completed", type: "sale", courseTitle: "أساسيات لغة TypeScript للمبتدئين" },
  { id: "t2", amount: 89, date: "2026-07-03", status: "completed", type: "sale", courseTitle: "تطوير واجهات المستخدم باستخدام React" },
  { id: "t3", amount: 3200, date: "2026-07-01", status: "completed", type: "payout" },
  { id: "t4", amount: 89, date: "2026-06-29", status: "completed", type: "sale", courseTitle: "تطوير واجهات المستخدم باستخدام React" }
];

// ==========================================
// CENTRALIZED STATE MANAGER FOR INTERACTIVE DEMO
// ==========================================

export function useTeachingData() {
  const queryClient = useQueryClient();

  // In-memory states to allow adding objects/updating state without real API database
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(mockEvents);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);

  const getStats = useQuery<InstructorStats>({
    queryKey: ["instructor-stats"],
    queryFn: async () => mockStats,
  });

  const getActivities = useQuery<ActivityLog[]>({
    queryKey: ["instructor-activities"],
    queryFn: async () => mockActivities,
  });

  // Course mutations
  const createCourse = useCallback((newCourse: Partial<Course>) => {
    const course: Course = {
      id: String(courses.length + 1),
      title: newCourse.title || "كورس جديد بدون عنوان",
      description: newCourse.description || "",
      thumbnail: newCourse.thumbnail || "https://images.unsplash.com/photo-1516116211223-5c359a36298a?w=500&auto=format&fit=crop&q=60",
      status: newCourse.status || "draft",
      studentsCount: 0,
      lessonsCount: 0,
      rating: 0,
      price: newCourse.price || 0,
      duration: "0 ساعة",
      category: newCourse.category || "عام",
      createdDate: new Date().toISOString().split("T")[0]!,
      chapters: newCourse.chapters || [],
    };
    setCourses((prev) => [course, ...prev]);
    return course;
  }, [courses]);

  const updateCourse = useCallback((id: string, updated: Partial<Course>) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  }, []);

  const deleteCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Messaging mutations
  const sendMessage = useCallback((convId: string, text: string) => {
    const newMessage: Message = {
      id: String(Date.now()),
      senderId: "me",
      senderName: "المدرب",
      senderAvatar: "",
      text,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessage: text,
            time: "الآن",
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );
  }, []);

  // Calendar mutations
  const addCalendarEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: String(calendarEvents.length + 1),
    };
    setCalendarEvents((prev) => [...prev, newEvent]);
  }, [calendarEvents]);

  // Review mutations
  const replyToReview = useCallback((reviewId: string, replyText: string) => {
    const newReply = {
      id: String(Date.now()),
      author: "المدرب",
      text: replyText,
      date: new Date().toISOString().split("T")[0]!,
    };

    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          return {
            ...r,
            replies: [...r.replies, newReply],
          };
        }
        return r;
      })
    );
  }, []);

  // Notification mutations
  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return {
    stats: getStats.data || mockStats,
    isStatsLoading: getStats.isLoading,
    activities: getActivities.data || mockActivities,
    isActivitiesLoading: getActivities.isLoading,
    courses,
    createCourse,
    updateCourse,
    deleteCourse,
    students: mockStudents,
    reviews,
    replyToReview,
    conversations,
    sendMessage,
    calendarEvents,
    addCalendarEvent,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    transactions: mockTransactions,
  };
}
