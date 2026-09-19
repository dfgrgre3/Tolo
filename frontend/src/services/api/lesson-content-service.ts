/**
 * Lesson Content API Service.
 *
 * Encapsulates lesson transcripts, timeline notes, and media cue assets.
 * Conforms to P0-1 / P0-4 architectural boundary rules: UI components and hooks
 * interact with this typed domain boundary rather than calling transport primitives
 * (apiClient / apiRoutes) directly.
 */
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

export interface LessonTranscriptResponse {
  content?: string;
}

export interface LessonNotesResponse {
  content?: string;
}

export interface SaveLessonNotesPayload {
  content: string;
}

export interface NoteItemPayload {
  id: string;
  clientId: string;
  time: number;
  text: string;
  createdAt?: string;
}

export interface LessonNoteItemsResponse {
  notes?: NoteItemPayload[];
}

/**
 * Fetches a lesson's transcript (SRT/VTT content).
 */
export async function getLessonTranscript(lessonId: string): Promise<LessonTranscriptResponse> {
  const payload = await apiClient.get<LessonTranscriptResponse>(
    apiRoutes.courses.lessonTranscript(lessonId)
  );
  return payload ?? {};
}

/**
 * Fetches per-note items for a lesson.
 */
export async function getLessonNoteItems(lessonId: string): Promise<LessonNoteItemsResponse> {
  const payload = await apiClient.get<LessonNoteItemsResponse>(
    apiRoutes.courses.lessonNoteItems(lessonId)
  );
  return payload ?? {};
}

/**
 * Fetches cloud timeline notes for a lesson.
 */
export async function getLessonNotes(lessonId: string): Promise<LessonNotesResponse> {
  const payload = await apiClient.get<LessonNotesResponse>(
    apiRoutes.courses.lessonNotes(lessonId)
  );
  return payload ?? {};
}

/**
 * Persists cloud timeline notes for a lesson.
 */
export async function saveLessonNotes(lessonId: string, content: string): Promise<void> {
  await apiClient.postJson(apiRoutes.courses.createNote(lessonId), { content });
}

/**
 * Fetches and returns raw WebVTT cues for thumbnail sprites.
 */
export async function fetchThumbnailVtt(thumbnailVttUrl: string): Promise<string> {
  const response = await apiClient.fetch(thumbnailVttUrl, { cache: "force-cache" });
  if (!response.ok) return "";
  return response.text();
}
