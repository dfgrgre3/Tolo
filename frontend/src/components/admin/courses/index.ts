// Admin Courses Components
// Re-export all components for clean imports

export { CourseCard } from "./course-card";
export { CourseListItem } from "./course-list-item";
export { CourseFilters } from "./course-filters";
export { CourseStats } from "./dashboard-stats";
export { CourseContentView } from "./course-content-view";
export { CoursePreviewPanel } from "./course-preview-panel";
export { CourseBulkActions } from "./course-bulk-actions";
export { CoursePagination } from "./course-pagination";
export { CourseEmptyState } from "./course-empty-state";
export { CourseEditor } from "./course-editor";

// ─── Types ───────────────────────────────────────────────────────────────────
export type { CourseBase, CourseCategory, CourseActionCallbacks } from "./types";
export { levelConfig } from "./types";
export type {
  CourseEditorProps,
  CourseFormValues,
  CourseCategory as EditorCourseCategory,
  CourseTeacher,
  CourseInitialData,
} from "./course-editor";
