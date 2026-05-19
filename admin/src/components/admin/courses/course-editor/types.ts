"use client";

import { z } from "zod";

// ─── Schema ──────────────────────────────────────────────────────────────────
export const courseSchema = z.object({
  name: z.string().min(1, "اسم الدورة بالإتجليزية مطلوب"),
  nameAr: z.string().min(1, "اسم الدورة بالعربية مطلوب"),
  code: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "السعر يجب أن يكون صفراً أو أكثر"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  isPublished: z.boolean(),
  durationHours: z.coerce
    .number()
    .min(0, "عدد الساعات يجب أن يكون صفراً أو أكثر"),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  trailerDurationMinutes: z.coerce.number().min(0).optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false),
  language: z.string().nullable().default("ar"),
  coursePrerequisites: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  whatYouLearn: z.string().optional().nullable(),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface CourseCategory {
  id: string;
  name: string;
}

export interface CourseTeacher {
  id: string;
  name: string;
}

export interface CourseInitialData {
  id: string;
  name?: string;
  nameAr?: string | null;
  code?: string | null;
  price?: number | null;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | string;
  instructorName?: string | null;
  instructorId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  isActive?: boolean;
  isPublished?: boolean;
  durationHours?: number | null;
  requirements?: string | null;
  learningObjectives?: string | null;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  trailerDurationMinutes?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
  isFeatured?: boolean;
  language?: string | null;
  coursePrerequisites?: string | string[] | null;
  targetAudience?: string | string[] | null;
  whatYouLearn?: string | string[] | null;
}

export interface CourseEditorProps {
  initialData?: CourseInitialData;
  courseId?: string;
  categories?: CourseCategory[];
  teachers?: CourseTeacher[];
  allCourses?: Array<{ id: string; name: string; nameAr?: string | null }>;
}

export interface CurriculumStats {
  chaptersCount: number;
  lessonsCount: number;
  freeLessonsCount: number;
  totalDurationMinutes: number;
}

export interface UploadedVideoMetadata {
  durationSeconds?: number;
  durationMinutes?: number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

// ─── Tab navigation helpers ──────────────────────────────────────────────────
export const TABS = ["general", "details", "media", "seo"] as const;
export type TabValue = (typeof TABS)[number];
