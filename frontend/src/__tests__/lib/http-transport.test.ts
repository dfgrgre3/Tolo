import { describe, it, expect, afterEach } from "vitest";
import { BrowserTransport, ServerTransport, createHttpTransport } from "@/lib/api/http-transport";

describe("HttpTransport Abstraction (P0-8)", () => {
  describe("BrowserTransport", () => {
    const transport = new BrowserTransport();

    it("prepends /api to relative endpoints", () => {
      expect(transport.resolveUrl("/courses")).toBe("/api/courses");
      expect(transport.resolveUrl("courses")).toBe("/api/courses");
    });

    it("leaves /api/... endpoints untouched", () => {
      expect(transport.resolveUrl("/api/courses")).toBe("/api/courses");
    });

    it("leaves absolute URLs untouched", () => {
      expect(transport.resolveUrl("https://example.com/api/v1")).toBe("https://example.com/api/v1");
      expect(transport.resolveUrl("http://localhost:8080/v1")).toBe("http://localhost:8080/v1");
    });

    it("handles empty strings", () => {
      expect(transport.resolveUrl("")).toBe("");
    });
  });

  describe("ServerTransport", () => {
    const transport = new ServerTransport();

    it("resolves through backend API url for relative endpoints", () => {
      const url = transport.resolveUrl("/courses");
      expect(url).toContain("/courses");
      // Starts with http:// or https://
      expect(url).toMatch(/^https?:\/\//);
    });

    it("leaves absolute URLs untouched", () => {
      expect(transport.resolveUrl("https://backend.internal/api/v1/test")).toBe(
        "https://backend.internal/api/v1/test"
      );
    });
  });

  describe("createHttpTransport factory", () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it("creates BrowserTransport when window is defined", () => {
      // @ts-expect-error mock window
      globalThis.window = {};
      const t = createHttpTransport();
      expect(t).toBeInstanceOf(BrowserTransport);
    });

    it("creates ServerTransport when window is undefined", () => {
      // @ts-expect-error mock undefined
      delete globalThis.window;
      const t = createHttpTransport();
      expect(t).toBeInstanceOf(ServerTransport);
    });
  });
});
