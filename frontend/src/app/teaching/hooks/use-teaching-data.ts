"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addTeachingCalendarEventRaw,
  fetchTeachingActivitiesRaw,
  fetchTeachingCalendarRaw,
  fetchTeachingConversationsRaw,
  fetchTeachingNotificationsRaw,
  fetchTeachingReviewsRaw,
  fetchTeachingStatsRaw,
  fetchTeachingStudentsRaw,
  fetchTeachingTransactionsRaw,
  markAllTeachingNotificationsReadRaw,
  markTeachingNotificationReadRaw,
  replyTeachingReviewRaw,
  sendTeachingMessageRaw,
} from "@/features/teaching/api/teaching-gateway";
import {
  contractCreateTeachingCourse,
  contractDeleteTeachingCourse,
  contractListTeachingCourses,
  contractUpdateTeachingCourse,
} from "@/services/api/contracts-teaching-courses-service";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { TeachingCourse, TeachingChapter, TeachingLessonInput } from "@/types/domain/teaching";
import { normalizeCourseLifecycle, type CourseLifecycle } from "@thanawy/shared/types/course-state";
import { unwrapOpenApiPayload } from "@/lib/api/generated-client";
import { queryProfiles } from "@/lib/query/query-profiles";

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

export type Lesson = TeachingLessonInput;
export type Chapter = TeachingChapter;
export type Course = TeachingCourse;

export function toTeachingStatusTransport(status: CourseLifecycle): CourseLifecycle {
  return status;
}

export function normalizeTeachingCourse(course: Course): Course {
  const nextStatus = normalizeCourseLifecycle({ status: course.status }) || "DRAFT";

  return {
    ...course,
    title: course.title?.trim() ? course.title : "عنوان غير مسمى",
    category: course.category?.trim() ? course.category : "غير مصنف",
    status: nextStatus as CourseLifecycle,
    thumbnail: course.thumbnail?.trim() ? course.thumbnail : "/images/courses/placeholder-course.jpg",
    description: course.description?.trim() ? course.description : "لا يوجد وصف متاح في الوقت الحالي.",
  };
}

export function createCourseDuplicateTitle(title: string): string {
  const baseTitle = title?.trim() ? title.trim() : "عنوان غير مسمى";
  return `${baseTitle} (نسخة جديدة)`;
}

/** Keeps the persisted lesson order identical to the editor's array order. */
export function reorderTeachingLessons(
  lessons: Lesson[],
  lessonIndex: number,
  direction: "up" | "down",
): Lesson[] {
  const list = [...lessons];
  const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;

  if (targetIndex >= 0 && targetIndex < list.length) {
    const current = list[lessonIndex]!;
    list[lessonIndex] = list[targetIndex]!;
    list[targetIndex] = current;
  }

  return list.map((lesson, index) => ({ ...lesson, order: index + 1 }));
}

export function mapTeachingLesson(lesson: Lesson) {
  return {
    ...(lesson.id ? { id: lesson.id } : {}),
    title: lesson.title,
    durationMinutes: lesson.durationMinutes,
    type: lesson.type,
    description: lesson.description ?? null,
    videoUrl: lesson.videoUrl ?? null,
    content: lesson.content ?? null,
    examId: lesson.examId ?? null,
    isFree: lesson.isFree ?? lesson.isPreview ?? false,
    order: lesson.order,
    attachments: lesson.attachments ?? [],
  };
}

/** Builds the PATCH contract without dropping valid course fields. */
export function buildCourseUpdateBody(data: Partial<Course>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.thumbnail !== undefined) body.thumbnail = data.thumbnail;
  if (data.price !== undefined) body.price = data.price;
  if (data.status !== undefined) body.status = toTeachingStatusTransport(data.status);
  if (data.level !== undefined) body.level = data.level;
  if (data.categoryId !== undefined) body.categoryId = data.categoryId;
  if (data.chapters !== undefined) body.chapters = mapTeachingChapters(data.chapters);
  if (data.deletedChapterIds && data.deletedChapterIds.length > 0) {
    body.deletedChapterIds = data.deletedChapterIds;
  }
  if (data.deletedLessonIds && data.deletedLessonIds.length > 0) {
    body.deletedLessonIds = data.deletedLessonIds;
  }
  const quizzes = mapTeachingQuizzes(data);
  if (quizzes.length > 0) body.quizzes = quizzes;
  return body;
}

function mapTeachingQuiz(quiz: NonNullable<Course["quiz"]>) {
  return {
    ...(quiz.id ? { id: quiz.id } : {}),
    lessonId: quiz.lessonId,
    title: quiz.title,
    passingScore: quiz.passingScore,
    required: quiz.required ?? true,
    maxAttempts: quiz.maxAttempts ?? 1,
    timeLimitMinutes: quiz.timeLimitMinutes,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
    showResultsImmediately: quiz.showResultsImmediately ?? true,
    showCorrectAnswers: quiz.showCorrectAnswers,
    allowReview: quiz.allowReview ?? true,
    status: quiz.status ?? "draft",
    questions: quiz.questions,
  };
}

function mapTeachingQuizzes(course: Partial<Course>) {
  const quizzes = course.quizzes ?? (course.quiz ? [course.quiz] : []);
  return quizzes.filter((quiz) => quiz.questions.length > 0).map(mapTeachingQuiz);
}

function mapTeachingChapters(chapters: Chapter[] = []) {
  return chapters.map((chapter) => ({
    ...(chapter.id ? { id: chapter.id } : {}),
    title: chapter.title,
    lessons: chapter.lessons.map(mapTeachingLesson),
  }));
}

export type { QuizQuestion } from "@/types/course-quiz";

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
  courseId?: string;
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

  // Only fetch teaching data for authenticated teachers/admins â€” the page
  // renders the "apply as teacher" screen for everyone else, and firing the
  // queries anyway would just produce a burst of 403 insufficient_role errors.
  const canFetch = isAuthenticated && isContentCreator();

  // Cache configuration — OPTIMIZED for performance
  const statsStaleTime = 60_000;              // 1 minute for stats
  const notificationsStaleTime = 120_000;     // 2 minutes for notifications
  const tabDataStaleTime = 5 * 60 * 1000;     // 5 minutes for tab data
  const gcTime = 10 * 60 * 1000;              // 10 minutes GC for all

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Stats: always enabled (needed in header + dashboard)
  // OPTIMIZED: Custom cache config with no refetchOnMount
  const statsQuery = useQuery<TeachingStatsResponse>({
    queryKey: ["teaching", "stats"],
    queryFn: () => fetchTeachingStatsRaw<TeachingStatsResponse>(),
    enabled: canFetch,
    staleTime: statsStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const stats = statsQuery.data ?? EMPTY_STATS;

  // â”€â”€ Activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Activities: only when dashboard tab is active
  // OPTIMIZED: Custom cache config with no refetchOnMount
  const activitiesQuery = useQuery<ActivitiesResponse>({
    queryKey: ["teaching", "activities"],
    queryFn: () => fetchTeachingActivitiesRaw<ActivitiesResponse>(),
    enabled: canFetch && activeTab === "dashboard",
    staleTime: tabDataStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const activities = activitiesQuery.data?.activities ?? [];

  // â”€â”€ Courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Courses: when dashboard or courses tab is active
  // OPTIMIZED: Custom cache config with no refetchOnMount
  const coursesQuery = useQuery<CoursesListResponse>({
    queryKey: ["teaching", "courses"],
    queryFn: async () => {
      const result = await contractListTeachingCourses();
      if (result.error) {
        throw new Error("Failed to load teaching courses");
      }

      const payload = unwrapOpenApiPayload<CoursesListResponse>(result.data) ?? { courses: [] };
      return { ...payload, courses: payload.courses.map(normalizeTeachingCourse) };
    },
    enabled: canFetch && (activeTab === "dashboard" || activeTab === "courses" || activeTab === "quizzes"),
    staleTime: tabDataStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const courses = coursesQuery.data?.courses ?? [];

  // Course mutations
  const createCourse = useMutation({
    mutationFn: async (newCourse: Partial<Course>) => {
      const body: Record<string, unknown> = {
        title: newCourse.title,
        description: newCourse.description,
        thumbnail: newCourse.thumbnail,
        price: newCourse.price ?? 0,
        status: toTeachingStatusTransport(newCourse.status ?? "DRAFT"),
        level: newCourse.level ?? "INTERMEDIATE",
        language: "ar",
        categoryId: newCourse.categoryId ?? undefined,
        chapters: mapTeachingChapters(newCourse.chapters),
        ...(mapTeachingQuizzes(newCourse).length > 0 ? { quizzes: mapTeachingQuizzes(newCourse) } : {}),
      };
      const result = await contractCreateTeachingCourse(body);
      return result.data?.data as unknown as { course: Course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Course> }) => {
      const body = buildCourseUpdateBody(data);
      const result = await contractUpdateTeachingCourse(id, body);
      return result.data?.data as unknown as { message?: string; course?: Course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const result = await contractDeleteTeachingCourse(id);
      return result.data?.data as unknown as { deleted: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["teaching", "stats"] });
    },
  });

  // â”€â”€ All Students (across all courses) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Students: only when students tab is active
  // OPTIMIZED: Custom cache config - heavy query, deferred until tab active
  const allStudentsQuery = useQuery<StudentsResponse>({
    queryKey: ["teaching", "students"],
    queryFn: () => fetchTeachingStudentsRaw<StudentsResponse>(),
    enabled: canFetch && activeTab === "students",
    staleTime: tabDataStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const allStudents = allStudentsQuery.data?.students ?? [];

  // â”€â”€ All Reviews (across all courses) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Reviews: only when reviews tab is active
  // OPTIMIZED: Custom cache config - heavy query, deferred until tab active
  const allReviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ["teaching", "reviews"],
    queryFn: () => fetchTeachingReviewsRaw<ReviewsResponse>(),
    enabled: canFetch && activeTab === "reviews",
    staleTime: tabDataStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const allReviews = allReviewsQuery.data?.reviews ?? [];

  const getStudentsForCourse = (courseId: string) =>
    allStudents.filter((s: Student) =>
      s.courseProgress?.some((p: { courseId: string }) => p.courseId === courseId)
    );

  const getReviewsForCourse = (courseId: string) =>
    allReviews.filter(
      (r: Review) => r.courseId === courseId
    );

  const replyToReview = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      replyTeachingReviewRaw<{ reply: ReviewReply }>(reviewId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching", "reviews"] });
    },
  });

  // â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Notifications: always enabled (needed in header)
  // OPTIMIZED: Longer staleTime since it's a lighter endpoint, no refetchOnMount
  const notificationsQuery = useQuery<NotificationsResponse>({
    queryKey: ["teaching", "notifications"],
    queryFn: () => fetchTeachingNotificationsRaw<NotificationsResponse>(),
    enabled: canFetch,
    staleTime: notificationsStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];

  const markNotificationRead = useMutation({
    mutationFn: (id: string) =>
      markTeachingNotificationReadRaw<{ marked: boolean }>(id),
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
      markAllTeachingNotificationsReadRaw<{ marked: boolean }>(),
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

  // â”€â”€ Messaging / Conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Conversations: only when messages tab is active
  // OPTIMIZED: Custom cache config - heavy query, deferred until tab active
  const conversationsQuery = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["teaching", "conversations"],
    queryFn: () => fetchTeachingConversationsRaw<{ conversations: Conversation[] }>(),
    enabled: canFetch && activeTab === "messages",
    staleTime: tabDataStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const conversations = conversationsQuery.data?.conversations ?? [];

  const sendMessageMutation = useMutation({
    mutationFn: ({ convId, text }: { convId: string; text: string }) =>
      sendTeachingMessageRaw<{ message: Message }>(convId, text),
    onMutate: async ({ convId, text }) => {
      await queryClient.cancelQueries({ queryKey: ["teaching", "conversations"] });
      const prev = queryClient.getQueryData<{ conversations: Conversation[] }>(["teaching", "conversations"]);
      if (prev) {
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          senderId: "me",
          senderName: "Ø£Ù†Ø§",
          senderAvatar: "",
          text,
          time: "Ø§Ù„Ø¢Ù†",
          isMe: true,
        };
        queryClient.setQueryData<{ conversations: Conversation[] }>(["teaching", "conversations"], {
          conversations: prev.conversations.map((c) =>
            c.id === convId
              ? { ...c, lastMessage: text, time: "Ø§Ù„Ø¢Ù†", messages: [...c.messages, newMsg] }
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

  // â”€â”€ Calendar Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Calendar: only when calendar tab is active
  // OPTIMIZED: Custom cache config - heavy query, deferred until tab active
  const calendarEventsQuery = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ["teaching", "calendar"],
    queryFn: () => fetchTeachingCalendarRaw<{ events: CalendarEvent[] }>(),
    enabled: canFetch && activeTab === "calendar",
    staleTime: tabDataStaleTime,
    gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });

  const calendarEvents = calendarEventsQuery.data?.events ?? [];

  const addCalendarEventMutation = useMutation({
    mutationFn: (event: Omit<CalendarEvent, "id">) =>
      addTeachingCalendarEventRaw<{ event: CalendarEvent }>(event),
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

  // â”€â”€ Transactions & Earnings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Transactions: only when earnings tab is active
  // OPTIMIZED: Using financial profile for data freshness but deferred until tab active
  // Also disabling refetchOnWindowFocus to avoid constant refetches
  const transactionsQuery = useQuery<{ transactions: Transaction[] }>({
    queryKey: ["teaching", "transactions"],
    queryFn: () => fetchTeachingTransactionsRaw<{ transactions: Transaction[] }>(),
    enabled: canFetch && activeTab === "earnings",
    ...queryProfiles.financial,
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
