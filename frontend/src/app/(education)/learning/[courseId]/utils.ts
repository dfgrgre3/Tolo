import { Lesson } from "./types";

export function formatLessonType(type: Lesson["type"]) {
  switch (type) {
    case "VIDEO":
      return "فيديو";
    case "QUIZ":
      return "اختبار";
    case "FILE":
      return "ملف";
    case "ARTICLE":
      return "شرح نصي";
    case "ASSIGNMENT":
      return "واجب";
    default:
      return "درس";
  }
}

export function formatMinutes(durationMinutes: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return "أقل من دقيقة";
  }

  if (durationMinutes < 60) {
    return `${durationMinutes.toLocaleString("ar-EG")} دقيقة`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours.toLocaleString("ar-EG")} ساعة`;
  }

  return `${hours.toLocaleString("ar-EG")} س ${minutes.toLocaleString("ar-EG")} د`;
}

export function bytesToMegaBytes(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
