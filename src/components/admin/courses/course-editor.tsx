// This file now re-exports from the course-editor directory.
// The component has been split into sub-components for maintainability.
export { CourseEditor } from "./course-editor/index";
export type {
  CourseEditorProps,
  CourseFormValues,
  CourseCategory,
  CourseTeacher,
  CourseInitialData,
} from "./course-editor/types";
