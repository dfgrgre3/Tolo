"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

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

interface TeachingStatsResponse extends InstructorStats {}

interface CoursesListResponse {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ActivitiesResponse {
  activities: ActivityLog[];
}

interface NotificationsResponse {
  notifications: NotificationItem[];
}

interface StudentsResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ReviewsResponse {
  reviews: Review[];
}

interface ApiSuccessResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ==========================================
// useTeachingData HOOK
// ==========================================

export function useTeachingData() {
  const queryClient = useQueryClient();

  // ── Stats ──────────────────────────────────────────
  const statsQuery = useQuery<TeachingStatsResponse>({
    queryKey: ["teaching", "stats"],
    queryFn: () =>
      apiClient.get<TeachingStatsResponse>(apiRoutes.teaching.dashboard.stats),
    retry: 1,
    staleTime: 60 * 1000,
  });

  const stats = statsQuery.data ?? {
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

  // ── Activities ─────────────────────────────────────
  const activitiesQuery = useQuery<ActivitiesResponse>({
    queryKey: ["teaching", "activities"],
    queryFn: () =>
      apiClient.get<ActivitiesResponse>(apiRoutes.teaching.activities),
    retry: 1,
    staleTime: 30 * 1000,
  });

  const activities = activitiesQuery.data?.activities ?? [];

  // ── Courses ────────────────────────────────────────
  const coursesQuery = useQuery<CoursesListResponse>({
    queryKey: ["teaching", "courses"],
    queryFn: () =>
      apiClient.get<CoursesListResponse>(apiRoutes.teaching.courses.list),
    retry: 1,
    staleTime: 30 * 1000,
  });

  const courses = coursesQuery.data?.courses ?? [];

  // Course mutations
  const createCourse = useMutation({
    mutationFn: (newCourse: Partial<Course>) => {
      // Transform frontend Course format to backend CreateCourse format
      const body: Record<string, unknown> = {
        title: newCourse.title,
        description: newCourse.description,
        thumbnail: newCourse.thumbnail,
        price: newCourse.price ?? 0,
        status: newCourse.status ?? "draft",
        level: "INTERMEDIATE",
        language: "ar",
        chapters: (newCourse.chapters ?? []).map((ch) => ({
          title: ch.title,
          lessons: ch.lessons.map((l) => ({
            title: l.title,
            duration: l.duration,
            type: l.type,
            url: l.url ?? "",
            isPreview: l.isPreview ?? false,
          })),
        })),
      };
      return apiClient.post<{ course: Course }>(
        apiRoutes.teaching.courses.create,
        body
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  const updateCourse = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Course>;
    }) => {
      const body: Record<string, unknown> = {};
      if (data.title !== undefined) body.title = data.title;
      if (data.description !== undefined) body.description = data.description;
      if (data.thumbnail !== undefined) body.thumbnail = data.thumbnail;
      if (data.price !== undefined) body.price = data.price;
      if (data.status !== undefined) body.status = data.status;
      return apiClient.patch<ApiSuccessResponse>(
        apiRoutes.teaching.courses.byId(id),
        body
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ deleted: boolean }>(
        apiRoutes.teaching.courses.byId(id)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  // ── All Students (across all courses) ──────────────────
  const allStudentsQuery = useQuery<StudentsResponse>({
    queryKey: ["teaching", "students"],
    queryFn: () =>
      apiClient.get<StudentsResponse>(apiRoutes.teaching.students.all),
    retry: 1,
    staleTime: 30 * 1000,
  });

  const allStudents = allStudentsQuery.data?.students ?? [];

  // ── All Reviews (across all courses) ───────────────────
  const allReviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ["teaching", "reviews"],
    queryFn: () =>
      apiClient.get<ReviewsResponse>(apiRoutes.teaching.reviews.all),
    retry: 1,
    staleTime: 30 * 1000,
  });

  const allReviews = allReviewsQuery.data?.reviews ?? [];

  // Course-specific filtering helpers (pure functions, no hooks)
  const getStudentsForCourse = (courseId: string) =>
    allStudents.filter((s: Student) =>
      s.courseProgress?.some((p) => p.courseId === courseId)
    );

  const getReviewsForCourse = (courseId: string) =>
    allReviews.filter(
      (r: Review) => (r as unknown as { courseId?: string }).courseId === courseId
    );

  const replyToReview = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) => {
      return apiClient.post<{ reply: ReviewReply }>(
        apiRoutes.teaching.reviews.reply(reviewId),
        { text }
      );
    },
    onSuccess: () => {
      // Invalidate all review queries
      queryClient.invalidateQueries({
        queryKey: ["teaching", "course"],
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.length >= 3 &&
            key[1] === "course" &&
            key[3] === "reviews"
          );
        },
      });
    },
  });

  // ── Notifications ────────────────────────────────────
  const notificationsQuery = useQuery<NotificationsResponse>({
    queryKey: ["teaching", "notifications"],
    queryFn: () =>
      apiClient.get<NotificationsResponse>(apiRoutes.teaching.notifications.list),
    retry: 1,
    staleTime: 30 * 1000,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];

  const markNotificationRead = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ marked: boolean }>(
        apiRoutes.teaching.notifications.markRead(id),
        {}
      ),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "notifications"] });
      const prev = queryClient.getQueryData<NotificationsResponse>([
        "teaching",
        "notifications",
      ]);
      if (prev) {
        queryClient.setQueryData<NotificationsResponse>(
          ["teaching", "notifications"],
          {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          }
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["teaching", "notifications"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teaching", "notifications"],
      });
    },
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: () =>
      apiClient.post<{ marked: boolean }>(
        apiRoutes.teaching.notifications.markAllRead,
        {}
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "notifications"] });
      const prev = queryClient.getQueryData<NotificationsResponse>([
        "teaching",
        "notifications",
      ]);
      if (prev) {
        queryClient.setQueryData<NotificationsResponse>(
          ["teaching", "notifications"],
          {
            ...prev,
            notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          }
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["teaching", "notifications"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teaching", "notifications"],
      });
    },
  });

  // ── Conversations (placeholder - chat not yet implemented) ──
  const conversations: Conversation[] = [];
  const sendMessage = (_convId: string, _text: string) => {
    // TODO: Implement when chat API is available
  };

  // ── Calendar Events (placeholder - calendar not yet implemented) ──
  const calendarEvents: CalendarEvent[] = [];
  const addCalendarEvent = (_event: Omit<CalendarEvent, "id">) => {
    // TODO: Implement when calendar API is available
  };

  // ── Transactions (placeholder - earnings API not yet implemented) ──
  const transactions: Transaction[] = [];
  // TODO: Implement when transactions API is available

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
    isDeletingCourse: deleteCourse.isPending,
    students: allStudents,
    isStudentsLoading: allStudentsQuery.isLoading,
    getStudentsForCourse,
    reviews: allReviews,
    isReviewsLoading: allReviewsQuery.isLoading,
    getReviewsForCourse,
    replyToReview: (id: string, text: string) =>
      replyToReview.mutate({ reviewId: id, text }),
    replyToReviewAsync: (id: string, text: string) =>
      replyToReview.mutateAsync({ reviewId: id, text }),
    isReplyingToReview: replyToReview.isPending,
    conversations,
    sendMessage,
    calendarEvents,
    addCalendarEvent,
    notifications,
    isNotificationsLoading: notificationsQuery.isLoading,
    markNotificationRead: markNotificationRead.mutate,
    markAllNotificationsRead: markAllNotificationsRead.mutate,
    transactions,
  };
}
