import { describe, it, expect } from "vitest";
import {
  toCanonicalCourse,
  toTeachingMutationPayload,
} from "@/lib/course/course-domain-adapter";

describe("course-domain-adapter (P0-2 & P0-3)", () => {
  describe("toCanonicalCourse", () => {
    it("maps legacy subject with topics and subtopics into canonical course", () => {
      const legacySubject = {
        id: "subj-101",
        name: "كورس الفيزياء الحديثة",
        description: "شرح شامل للفيزياء",
        price: 250,
        status: "PUBLISHED",
        level: "ADVANCED",
        topics: [
          {
            id: "topic-1",
            title: "الفصل الأول: الحركة الموجية",
            order: 1,
            subTopics: [
              {
                id: "lesson-1",
                title: "مقدمة في الأمواج",
                type: "VIDEO",
                duration: 25,
                isFree: true,
                videoUrl: "https://example.com/video1.mp4",
                attachments: [
                  {
                    id: "att-1",
                    title: "ملف الشرح PDF",
                    fileUrl: "https://example.com/notes.pdf",
                  },
                ],
              },
            ],
          },
        ],
      };

      const canonical = toCanonicalCourse(legacySubject);

      expect(canonical.id).toBe("subj-101");
      expect(canonical.title).toBe("كورس الفيزياء الحديثة");
      expect(canonical.pricing.price).toBe(250);
      expect(canonical.pricing.isFree).toBe(false);
      expect(canonical.status).toBe("PUBLISHED");
      expect(canonical.level).toBe("ADVANCED");
      expect(canonical.sections).toHaveLength(1);

      const section = canonical.sections[0]!;
      expect(section.id).toBe("topic-1");
      expect(section.title).toBe("الفصل الأول: الحركة الموجية");
      expect(section.lessons).toHaveLength(1);

      const lesson = section.lessons[0]!;
      expect(lesson.id).toBe("lesson-1");
      expect(lesson.title).toBe("مقدمة في الأمواج");
      expect(lesson.durationMinutes).toBe(25);
      expect(lesson.isPreview).toBe(true);
      expect(lesson.attachments).toHaveLength(1);
      expect(lesson.attachments![0]!.title).toBe("ملف الشرح PDF");
    });

    it("handles teaching course shape with chapters and lessons", () => {
      const teachingCourse = {
        id: "teach-202",
        title: "كيمياء الثانوية العامة",
        thumbnail: "https://example.com/thumb.jpg",
        chapters: [
          {
            id: "chap-1",
            title: "الكيمياء الكهربية",
            lessons: [
              {
                id: "les-1",
                title: "الخلايا الجلفانية",
                type: "VIDEO",
                durationMinutes: 40,
                isPreview: false,
              },
            ],
          },
        ],
      };

      const canonical = toCanonicalCourse(teachingCourse);

      expect(canonical.id).toBe("teach-202");
      expect(canonical.title).toBe("كيمياء الثانوية العامة");
      expect(canonical.thumbnailUrl).toBe("https://example.com/thumb.jpg");
      expect(canonical.sections[0]!.title).toBe("الكيمياء الكهربية");
      expect(canonical.sections[0]!.lessons[0]!.durationMinutes).toBe(40);
    });
  });

  describe("toTeachingMutationPayload", () => {
    it("transforms canonical course into backend teaching payload with explicit deletions (P0-3)", () => {
      const canonical = toCanonicalCourse({
        id: "course-123",
        title: "رياضيات متقدمة",
        price: 300,
        chapters: [
          {
            id: "sec-1",
            title: "التفاضل والتكامل",
            lessons: [
              {
                id: "les-1",
                title: "نهايات الدوال",
                type: "VIDEO",
                durationMinutes: 30,
              },
            ],
          },
        ],
      });

      const payload = toTeachingMutationPayload(canonical, {
        deletedChapterIds: ["old-chap-99"],
        deletedLessonIds: ["old-les-88", "old-les-77"],
      });

      expect(payload.title).toBe("رياضيات متقدمة");
      expect(payload.price).toBe(300);
      expect(payload.chapters).toHaveLength(1);
      expect(payload.deletedChapterIds).toEqual(["old-chap-99"]);
      expect(payload.deletedLessonIds).toEqual(["old-les-88", "old-les-77"]);
    });
  });
});
