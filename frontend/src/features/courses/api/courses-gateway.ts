/**
 * Courses API Gateway
 *
 * المالك الوحيد لاستدعاءات الكورسات: كتالوج، تفاصيل، تسجيل (خام)،
 * تقييمات، أسئلة، ملاحظات الدروس، سلة، مفضلة، مكتبة، موارد، مدرسون، امتحانات.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 *
 * Raw 1:1 mirrors (حد ترحيل الواجهات F-018): نفس المسار والطريقة
 * والحمولة التي استخدمتها الواجهة — صفر تغيير سلوكي بالتصميم.
 * (مسارات apiRoutes القياسية تكافئ الليترالات القديمة عبر تطبيع
 * getBackendApiUrl الذي يوحّد بادئة /api.)
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

type RawPayload = Record<string, unknown>;
type RequestOptions = { signal?: AbortSignal; retries?: number };

// ─── المفضلة والسلة ──────────────────────────────────────────────────

export function fetchWishlistRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.wishlistList);
}

export function addWishlistItemRaw(id: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.courses.wishlist(id), {});
}

export function removeWishlistItemRaw(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.courses.wishlist(id));
}

export function fetchCartRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.cart.get);
}

export function removeCartItemRaw(subjectId: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.cart.item(subjectId));
}

export function addCartItemRaw(subjectId: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.cart.items, { subjectId });
}

export function checkoutCartRaw<T>(paymentMethod: string, couponCode?: string): Promise<T> {
  return apiClient.postJson<T>(apiRoutes.cart.checkout, {
    paymentMethod,
    couponCode: couponCode || undefined,
  });
}

export function fetchWalletBalanceRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.billing.wallet);
}

// ─── الكتالوج والقوائم ───────────────────────────────────────────────

export function fetchCoursesListRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.list);
}

export function fetchMyCoursesRaw<T = unknown>(query = ""): Promise<T> {
  return apiClient.get<T>(`${apiRoutes.subjects.myCourses}${query}`);
}

export function fetchCatalogPageRaw<T = unknown>(limit: number, page?: number): Promise<T> {
  return apiClient.get<T>(
    `/courses?limit=${limit}${page !== undefined ? `&page=${page}` : ""}`,
  );
}

export function fetchCategoriesRaw<T = unknown>(query = ""): Promise<T> {
  return apiClient.get<T>(`/categories${query}`);
}

export function fetchPublicCoursesRaw<T>(query: string): Promise<T> {
  return apiClient.get<T>(`/courses${query}`);
}

export function fetchHomepageStatsRaw<T>(): Promise<T> {
  return apiClient.get<T>("/homepage");
}

export function fetchHomeBlogFeedRaw<T>(query: string): Promise<T> {
  return apiClient.get<T>(`/blog${query}`);
}

// ─── تفاصيل الكورس والتسجيل (خام) ────────────────────────────────────

export function fetchCourseDetailRaw<T>(slug: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.detail(slug));
}

export function fetchCourseByIdRaw<T>(slug: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.byId(slug));
}

export function checkEnrollmentEligibilityRaw<T>(slug: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.eligibility(slug));
}

export function enrollCourseRaw<T>(slug: string): Promise<T> {
  return apiClient.post<T>(apiRoutes.courses.enroll(slug), {});
}

export function checkoutCourseRaw<T>(slug: string, payload: RawPayload): Promise<T> {
  return apiClient.post<T>(apiRoutes.courses.checkout(slug), payload);
}

// ─── التقييمات ───────────────────────────────────────────────────────

export function fetchCourseReviewsRaw<T>(courseId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.reviews(courseId));
}

export function createCourseReviewRaw<T>(courseId: string, payload: RawPayload): Promise<T> {
  return apiClient.postJson<T>(apiRoutes.courses.createReview(courseId), payload);
}

export function postReviewCommentRaw(reviewId: string, comment: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.courses.reviewComments(reviewId), { comment });
}

export function deleteReviewCommentRaw(commentId: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.courses.reviewComment(commentId));
}

// ─── أسئلة الكورس ────────────────────────────────────────────────────

export function fetchCourseQuestionsRaw<T>(courseId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.questions(courseId));
}

export function createCourseQuestionRaw(
  courseId: string,
  payload: RawPayload,
): Promise<unknown> {
  return apiClient.postJson(apiRoutes.courses.questions(courseId), payload);
}

export function answerCourseQuestionRaw(questionId: string, body: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.courses.questionAnswers(questionId), { body });
}

// ─── بيئة التعلم (منهج/ملاحظات/أسئلة الدروس) ─────────────────────────

export function fetchCurriculumRaw<T>(courseId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.curriculum(courseId));
}

export function fetchLessonNotesRaw<T>(lessonId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.lessonNotes(lessonId));
}

export function fetchLessonQuestionsRaw<T>(lessonId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.courses.lessonQuestions(lessonId));
}

export function createLessonNoteRaw(lessonId: string, content: string): Promise<unknown> {
  return apiClient.post(apiRoutes.courses.createNote(lessonId), { content });
}

export function postLessonQuestionRaw<T>(lessonId: string, content: string): Promise<T> {
  return apiClient.post<T>(apiRoutes.courses.lessonQuestions(lessonId), { content });
}

export function postLessonAiChatRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.post<T>(apiRoutes.ai.chat, payload);
}

// ─── المكتبة والموارد ────────────────────────────────────────────────

export function fetchLibraryCategoriesRaw<T>(): Promise<T> {
  return apiClient.get<T>("/categories");
}

export function fetchLibraryBooksRaw<T>(): Promise<T> {
  return apiClient.get<T>("/library/books");
}

export function createLibraryBookRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.post<T>("/library/books", payload);
}

export function fetchResourcesRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.resources.list);
}

// ─── المدرسون ────────────────────────────────────────────────────────

export function fetchTeachersRaw<T>(query = ""): Promise<T> {
  return apiClient.get<T>(`${apiRoutes.teachers.list}${query}`);
}

export function fetchTeacherLessonsRaw<T>(): Promise<T> {
  return apiClient.get<T>("/lessons");
}

export function fetchTeacherScheduleRaw<T>(): Promise<T> {
  return apiClient.get<T>("/schedule");
}

export function createTeacherLessonRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.post<T>("/lessons", payload);
}

export function updateTeacherScheduleRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.post<T>("/schedule", payload);
}

// ─── امتحانات المعلمين والدرجات ──────────────────────────────────────

export function fetchExamResultsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.exams.results);
}

export function fetchGradesRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.grades.list);
}

export function createExamRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(apiRoutes.exams.list, payload);
}

export function createExamResultRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(apiRoutes.exams.results, payload);
}

export function createGradeRaw(payload: RawPayload): Promise<unknown> {
  return apiClient.postJson(apiRoutes.grades.list, payload);
}

export function deleteExamResultRaw(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.exams.result(id));
}

export function deleteExamRaw(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.exams.byId(id));
}

export function deleteGradeRaw(id: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.grades.byId(id));
}
