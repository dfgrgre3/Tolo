export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type SubTopicType = 'VIDEO' | 'QUIZ' | 'ARTICLE' | 'ASSIGNMENT';

export interface Subject {
    id: string;
    name: string;
    nameAr?: string | null;
    code?: string | null;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    isActive: boolean;
    isPublished: boolean;
    price: number;
    rating: number;
    enrolledCount: number;
    thumbnailUrl?: string | null;
    trailerUrl?: string | null;
    trailerDurationMinutes: number;
    slug?: string | null;
    level: Level;
    instructorName?: string | null;
    instructorId?: string | null;
    categoryId?: string | null;
    durationHours: number;
    requirements?: string | null;
    learningObjectives?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    isFeatured: boolean;
    language: string;

    // New arrays mapped from Go
    coursePrerequisites: string[];
    targetAudience: string[];
    whatYouLearn: string[];
    completionRate: number;
    videoCount: number;
    type: string;
    lastContentUpdate?: Date | string | null;

    createdAt: Date | string;
    updatedAt: Date | string;

    // Relations
    topics?: Topic[];
}

export interface Topic {
    id: string;
    subjectId: string;
    title: string;
    description?: string | null;
    order: number;
    createdAt: Date | string;
    updatedAt: Date | string;

    // Relations
    subTopics?: SubTopic[];
}

export interface SubTopic {
    id: string;
    topicId: string;
    title: string;
    description?: string | null;
    content?: string | null;
    videoUrl?: string | null;
    type: SubTopicType;
    examId?: string | null;
    order: number;
    durationMinutes: number;
    isFree: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;

    // Relations
    attachments?: LessonAttachment[];
}

export interface LessonAttachment {
    id: string;
    subTopicId: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: Date | string;
}

export interface CourseReview {
    id: string;
    subjectId: string;
    userId: string;
    rating: number;
    comment: string;
    isVisible: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}
