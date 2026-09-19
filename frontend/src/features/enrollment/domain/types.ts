/**
 * Enrollment Domain — نطاق التسجيل في الكورسات
 *
 * المالك الوحيد لنماذج: التسجيل، الإلغاء، حالة التسجيل، اشتراطات التسجيل.
 */

// ─── حالة التسجيل ─────────────────────────────────────────────────

export type EnrollmentStatus =
  | "enrolled"
  | "not_enrolled"
  | "pending"
  | "suspended"
  | "completed"
  | "cancelled";

export interface EnrollmentStatusResponse {
  enrolled: boolean;
  status: EnrollmentStatus;
  enrolledAt?: string;
  expiresAt?: string;
  completedAt?: string;
}

// ─── شروط التسجيل (Eligibility) ───────────────────────────────────

export interface EnrollmentEligibility {
  eligible: boolean;
  reason?: string;
  /** هل يحتاج المستخدم اشتراكاً نشطاً للتسجيل */
  requiresSubscription?: boolean;
  /** هل الكورس مدفوع */
  requiresPayment?: boolean;
  /** السعر إن وجد */
  price?: number;
  currency?: string;
}

// ─── طلب التسجيل / الإلغاء ────────────────────────────────────────

export interface EnrollRequest {
  courseId: string;
  paymentMethod?: string;
}

export interface EnrollResponse {
  success: boolean;
  message?: string;
  enrollmentId?: string;
}

export interface UnenrollResponse {
  success: boolean;
  message?: string;
}

// ─── كورسات المستخدم ──────────────────────────────────────────────

export interface MyCourse {
  id: string;
  title: string;
  thumbnail?: string;
  instructor?: string;
  progress?: number;
  enrolledAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
  status: EnrollmentStatus;
}
