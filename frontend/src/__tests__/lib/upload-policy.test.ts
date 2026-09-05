import { describe, it, expect } from "vitest";
import {
  SERVER_MAX_FILE_SIZE,
  MAX_SIMPLE_UPLOAD_SIZE,
  MAX_CHUNKED_UPLOAD_SIZE,
  SERVER_ALLOWED_TYPES,
  isFileTypeAllowed,
  sanitizeFolder,
} from "@/lib/storage/upload-policy";
import {
  generateUserPath,
  validateFileType,
  validateFileSize,
  formatFileSize,
} from "@/lib/storage/client";

/**
 * اختبارات سياسة الرفع — القيود المفروضة من الخادم يجب ألا يمكن للعميل
 * توسيعها أبداً (يمكنه فقط تضييقها).
 */
describe("isFileTypeAllowed (server master allowlist)", () => {
  it("rejects empty MIME type", () => {
    expect(isFileTypeAllowed("")).toBe(false);
  });

  it("accepts image/video/audio/font families", () => {
    expect(isFileTypeAllowed("image/png")).toBe(true);
    expect(isFileTypeAllowed("image/svg+xml")).toBe(true);
    expect(isFileTypeAllowed("video/mp4")).toBe(true);
    expect(isFileTypeAllowed("audio/mpeg")).toBe(true);
    expect(isFileTypeAllowed("font/woff2")).toBe(true);
  });

  it("accepts explicit document types", () => {
    expect(isFileTypeAllowed("application/pdf")).toBe(true);
    expect(isFileTypeAllowed("application/zip")).toBe(true);
    expect(isFileTypeAllowed("text/plain")).toBe(true);
    expect(isFileTypeAllowed("text/csv")).toBe(true);
    expect(isFileTypeAllowed("application/json")).toBe(true);
  });

  it("rejects HTML/XHTML (phishing on trusted domain)", () => {
    expect(isFileTypeAllowed("text/html")).toBe(false);
    expect(isFileTypeAllowed("application/xhtml+xml")).toBe(false);
  });

  it("rejects executables and unknown types", () => {
    expect(isFileTypeAllowed("application/x-msdownload")).toBe(false);
    expect(isFileTypeAllowed("application/octet-stream")).toBe(false);
    expect(isFileTypeAllowed("application/x-sh")).toBe(false);
  });

  it("caps simple file size at 50 MB and chunked at 500 MB", () => {
    expect(SERVER_MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    expect(MAX_SIMPLE_UPLOAD_SIZE).toBe(50 * 1024 * 1024);
    expect(MAX_CHUNKED_UPLOAD_SIZE).toBe(500 * 1024 * 1024);
  });
});

describe("sanitizeFolder (path traversal protection)", () => {
  it("reduces the folder to a single safe segment", () => {
    expect(sanitizeFolder("avatars")).toBe("avatars");
    expect(sanitizeFolder("lesson-assets")).toBe("lesson-assets");
    expect(sanitizeFolder("my_folder")).toBe("my_folder");
  });

  it("neutralizes traversal attempts", () => {
    expect(sanitizeFolder("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFolder("..\\..\\windows")).not.toContain("\\");
    expect(sanitizeFolder("a/b/c")).not.toContain("/");
  });

  it("falls back to 'uploads' when nothing safe remains", () => {
    expect(sanitizeFolder("///")).toBe("uploads");
    expect(sanitizeFolder("---")).toBe("uploads");
  });
});

describe("generateUserPath", () => {
  it("isolates every upload under the verified user id", () => {
    const path = generateUserPath("user-123", "photo.png", "avatars");
    expect(path.startsWith("avatars/user-123/")).toBe(true);
    expect(path.endsWith("photo.png")).toBe(true);
  });

  it("uses bare userId when no folder is given", () => {
    const path = generateUserPath("user-123", "doc.pdf");
    expect(path.startsWith("user-123/")).toBe(true);
  });

  it("sanitizes hostile file names (no separators → no traversal)", () => {
    const path = generateUserPath("user-123", "../../evil<script>.png");
    // التعقيم يستبدل الفواصل بـ _ فيبقى ".." جزءاً من الاسم وليس مكون مسار —
    // الشرط الأمني: لا فواصل مسار ولا "<" داخل الاسم المولَّد.
    const fileName = path.split("/").pop() ?? "";
    expect(fileName).not.toContain("<");
    expect(fileName).not.toMatch(/[^a-zA-Z0-9._-]/);
    expect(path.split("/").length).toBe(2); // userId/fileName — لا أعماق إضافية
  });
});

describe("validateFileType (client narrowing)", () => {
  it("empty allowlist accepts everything (server limits still apply)", () => {
    expect(validateFileType({ type: "application/pdf" } as File, [])).toBe(true);
  });

  it("wildcard matching", () => {
    expect(validateFileType({ type: "image/png" } as File, ["image/*"])).toBe(true);
    expect(validateFileType({ type: "video/mp4" } as File, ["image/*"])).toBe(false);
  });

  it("exact matching", () => {
    expect(validateFileType({ type: "application/pdf" } as File, ["application/pdf"])).toBe(true);
    expect(validateFileType({ type: "application/pdf" } as File, ["image/png"])).toBe(false);
  });
});

describe("validateFileSize / formatFileSize", () => {
  it("boundary check is inclusive", () => {
    expect(validateFileSize({ size: 1024 } as File, 1024)).toBe(true);
    expect(validateFileSize({ size: 1025 } as File, 1024)).toBe(false);
  });

  it("formats sizes readably", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });
});
