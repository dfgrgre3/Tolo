"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { usePermission } from "@/hooks/use-permission";

// ==========================================
// TYPES DEFINITIONS (matching backend response)
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

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "pdf" | "quiz" | "assignment";
  url?: string;
  isPreview?: boolean;
  description?: string;
  attachmentName?: string;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
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

export interface ReviewReply {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface Review {
  id: string;
  studentName: string;
  studentAvatar: string;
  courseTitle: string;
  rating: number;
  comment: string;
  date: string;
  replies: ReviewReply[];
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
  date: string;
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
// API RESPONSE TYPES
// ==========================================

export interface TeachingStatsResponse extends InstructorStats {}

export interface CoursesListResponse {
  courses: Course[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivitiesResponse {
  activities: ActivityLog[];
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
}

export interface StudentsResponse {
  students: Student[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
}

export interface ApiSuccessResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

const EMPTY_STATS: InstructorStats = {
  totalCourses: 0,
  publishedCourses: 0,
  draftCourses: 0,
  totalStudents: 0,
  enrollmentsCount: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  completionRate: 0,
  averageRating: 0,
  totalHours: 0,
  certificatesIssued: 0,
  unreadMessages: 0,
  pendingReviews: 0,
};

// ==========================================
// useTeachingData HOOK (100% Pure API Integration)
// ==========================================

export function useTeachingData(activeTab: string = "dashboard") {
  const queryClient = useQueryClient();
  const { isAuthenticated, isContentCreator } = usePermission();

  // Only fetch teaching data for authenticated teachers/admins — the page
  // renders the "apply as teacher" screen for everyone else, and firing the
  // queries anyway would just produce a burst of 403 insufficient_role errors.
  const canFetch = isAuthenticated && isContentCreator();

  // Cache configuration
  const STALE_TIME = 5 * 60 * 1000;  // 5 minutes
  const GC_TIME = 10 * 60 * 1000;    // 10 minutes

  // ── Stats ──────────────────────────────────────────
  // Stats: always enabled (needed in header + dashboard)
  const statsQuery = useQuery<TeachingStatsResponse>({
    queryKey: ["teaching", "stats"],
    queryFn: () => apiClient.get<TeachingStatsResponse>(apiRoutes.teaching.dashboard.stats),
    enabled: canFetch,
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const stats = statsQuery.data ?? EMPTY_STATS;

  // ── Activities ─────────────────────────────────────
  // Activities: only when dashboard tab is active
  const activitiesQuery = useQuery<ActivitiesResponse>({
    queryKey: ["teaching", "activities"],
    queryFn: () => apiClient.get<ActivitiesResponse>(apiRoutes.teaching.activities),
    enabled: canFetch && activeTab === "dashboard",
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const activities = activitiesQuery.data?.activities ?? [];

  // ── Courses ────────────────────────────────────────
  // Courses: when dashboard or courses tab is active
  const coursesQuery = useQuery<CoursesListResponse>({
    queryKey: ["teaching", "courses"],
    queryFn: () => apiClient.get<CoursesListResponse>(apiRoutes.teaching.courses.list),
    enabled: canFetch && (activeTab === "dashboard" || activeTab === "courses"),
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const courses = coursesQuery.data?.courses ?? [];

  // Course mutations
  const createCourse = useMutation({
    mutationFn: (newCourse: Partial<Course>) => {
      const body: Record<string, unknown> = {
        title: newCourse.title,
        description: newCourse.description,
        thumbnail: newCourse.thumbnail,
        price: newCourse.price ?? 0,
        status: newCourse.status ?? "draft",
        level: "INTERMEDIATE",
        language: "ar",
        chapters: (newCourse.chapters ?? []).map((ch: Chapter) => ({
          title: ch.title,
          lessons: ch.lessons.map((l: Lesson) => ({
            title: l.title,
            duration: l.duration,
            type: l.type,
            url: l.url ?? "",
            isPreview: l.isPreview ?? false,
          })),
        })),
      };
      return apiClient.post<{ course: Course }>(apiRoutes.teaching.courses.create, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  const updateCourse = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) => {
      const body: Record<string, unknown> = {};
      if (data.title !== undefined) body.title = data.title;
      if (data.description !== undefined) body.description = data.description;
      if (data.thumbnail !== undefined) body.thumbnail = data.thumbnail;
      if (data.price !== undefined) body.price = data.price;
      if (data.status !== undefined) body.status = data.status;
      return apiClient.patch<ApiSuccessResponse>(apiRoutes.teaching.courses.byId(id), body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(apiRoutes.teaching.courses.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  // ── All Students (across all courses) ──────────────────
  // Students: only when students tab is active
  const allStudentsQuery = useQuery<StudentsResponse>({
    queryKey: ["teaching", "students"],
    queryFn: () => apiClient.get<StudentsResponse>(apiRoutes.teaching.students.all),
    enabled: canFetch && activeTab === "students",
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const allStudents = allStudentsQuery.data?.students ?? [];

  // ── All Reviews (across all courses) ───────────────────
  // Reviews: only when reviews tab is active
  const allReviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ["teaching", "reviews"],
    queryFn: () => apiClient.get<ReviewsResponse>(apiRoutes.teaching.reviews.all),
    enabled: canFetch && activeTab === "reviews",
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const allReviews = allReviewsQuery.data?.reviews ?? [];

  const getStudentsForCourse = (courseId: string) =>
    allStudents.filter((s: Student) =>
      s.courseProgress?.some((p: { courseId: string }) => p.courseId === courseId)
    );

  const getReviewsForCourse = (courseId: string) =>
    allReviews.filter(
      (r: Review) => (r as unknown as { courseId?: string }).courseId === courseId
    );

  const replyToReview = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      apiClient.post<{ reply: ReviewReply }>(
        apiRoutes.teaching.reviews.reply(reviewId),
        { text }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "reviews"] });
    },
  });

  // ── Notifications ────────────────────────────────────
  // Notifications: always enabled (needed in header)
  const notificationsQuery = useQuery<NotificationsResponse>({
    queryKey: ["teaching", "notifications"],
    queryFn: () => apiClient.get<NotificationsResponse>(apiRoutes.teaching.notifications.list),
    enabled: canFetch,
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];

  const markNotificationRead = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ marked: boolean }>(apiRoutes.teaching.notifications.markRead(id), {}),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "notifications"] });
      const prev = queryClient.getQueryData<NotificationsResponse>(["teaching", "notifications"]);
      if (prev) {
        queryClient.setQueryData<NotificationsResponse>(["teaching", "notifications"], {
          ...prev,
          notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["teaching", "notifications"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "notifications"] });
    },
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: () =>
      apiClient.post<{ marked: boolean }>(apiRoutes.teaching.notifications.markAllRead, {}),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "notifications"] });
      const prev = queryClient.getQueryData<NotificationsResponse>(["teaching", "notifications"]);
      if (prev) {
        queryClient.setQueryData<NotificationsResponse>(["teaching", "notifications"], {
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["teaching", "notifications"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "notifications"] });
    },
  });

  // ── Messaging / Conversations ───────────────────────
  // Conversations: only when messages tab is active
  const conversationsQuery = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["teaching", "conversations"],
    queryFn: () => apiClient.get<{ conversations: Conversation[] }>("/api/teaching/conversations"),
    enabled: canFetch && activeTab === "messages",
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const conversations = conversationsQuery.data?.conversations ?? [];

  const sendMessageMutation = useMutation({
    mutationFn: ({ convId, text }: { convId: string; text: string }) =>
      apiClient.post<{ message: Message }>(`/api/teaching/conversations/${convId}/messages`, { text }),
    onMutate: async ({ convId, text }) => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "conversations"] });
      const prev = queryClient.getQueryData<{ conversations: Conversation[] }>(["teaching", "conversations"]);
      if (prev) {
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          senderId: "me",
          senderName: "أنا",
          senderAvatar: "",
          text,
          time: "الآن",
          isMe: true,
        };
        queryClient.setQueryData<{ conversations: Conversation[] }>(["teaching", "conversations"], {
          conversations: prev.conversations.map((c) =>
            c.id === convId
              ? { ...c, lastMessage: text, time: "الآن", messages: [...c.messages, newMsg] }
              : c
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["teaching", "conversations"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "conversations"] });
    },
  });

  // ── Calendar Events ──────────────────────────────────
  // Calendar: only when calendar tab is active
  const calendarEventsQuery = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ["teaching", "calendar"],
    queryFn: () => apiClient.get<{ events: CalendarEvent[] }>("/api/teaching/calendar"),
    enabled: canFetch && activeTab === "calendar",
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const calendarEvents = calendarEventsQuery.data?.events ?? [];

  const addCalendarEventMutation = useMutation({
    mutationFn: (event: Omit<CalendarEvent, "id">) =>
      apiClient.post<{ event: CalendarEvent }>("/api/teaching/calendar", event),
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "calendar"] });
      const prev = queryClient.getQueryData<{ events: CalendarEvent[] }>(["teaching", "calendar"]);
      const created: CalendarEvent = { ...newEvent, id: `evt-${Date.now()}` };
      queryClient.setQueryData<{ events: CalendarEvent[] }>(["teaching", "calendar"], {
        events: [...(prev?.events ?? []), created],
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["teaching", "calendar"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "calendar"] });
    },
  });

  // ── Transactions & Earnings ──────────────────────────
  // Transactions: only when earnings tab is active
  const transactionsQuery = useQuery<{ transactions: Transaction[] }>({
    queryKey: ["teaching", "transactions"],
    queryFn: () => apiClient.get<{ transactions: Transaction[] }>("/api/teaching/transactions"),
    enabled: canFetch && activeTab === "earnings",
    retry: 1,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  const transactions = transactionsQuery.data?.transactions ?? [];

  return {
    stats,
    isStatsLoading: statsQuery.isLoading,
    activities,
    isActivitiesLoading: activitiesQuery.isLoading,
    courses,
    isCoursesLoading: coursesQuery.isLoading,
    createCourse: createCourse.mutate,
    createCourseAsync: createCourse.mutateAsync,
    isCreatingCourse: createCourse.isPending,
    updateCourse: updateCourse.mutate,
    updateCourseAsync: updateCourse.mutateAsync,
    isUpdatingCourse: updateCourse.isPending,
    deleteCourse: deleteCourse.mutate,
    deleteCourseAsync: deleteCourse.mutateAsync,
    isDeletingCourse: deleteCourse.isPending,
    students: allStudents,
    isStudentsLoading: allStudentsQuery.isLoading,
    getStudentsForCourse,
    reviews: allReviews,
    isReviewsLoading: allReviewsQuery.isLoading,
    getReviewsForCourse,
    replyToReview: (id: string, text: string) => replyToReview.mutate({ reviewId: id, text }),
    replyToReviewAsync: (id: string, text: string) => replyToReview.mutateAsync({ reviewId: id, text }),
    isReplyingToReview: replyToReview.isPending,
    conversations,
    sendMessage: (convId: string, text: string) => sendMessageMutation.mutate({ convId, text }),
    calendarEvents,
    addCalendarEvent: (event: Omit<CalendarEvent, "id">) => addCalendarEventMutation.mutate(event),
    notifications,
    isNotificationsLoading: notificationsQuery.isLoading,
    markNotificationRead: markNotificationRead.mutate,
    markAllNotificationsRead: markAllNotificationsRead.mutate,
    transactions,
    isTransactionsLoading: transactionsQuery.isLoading,
    isCalendarLoading: calendarEventsQuery.isLoading,
  };
}
