/**
 * Learning API Services (P0-12 / P0-14)
 */

export {
  getLessonTranscript,
  getLessonNoteItems,
  getLessonNotes,
  saveLessonNotes,
  fetchThumbnailVtt,
  type LessonTranscriptResponse,
  type LessonNotesResponse,
  type SaveLessonNotesPayload,
  type NoteItemPayload,
  type LessonNoteItemsResponse,
} from "@/services/api/lesson-content-service";
