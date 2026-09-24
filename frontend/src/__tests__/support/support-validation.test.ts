import { describe, it, expect } from "vitest";
import {
    SUPPORT_ID_MAX_LENGTH,
    SUPPORT_SEARCH_MAX_LENGTH,
    SUPPORT_SLUG_MAX_LENGTH,
    isSupportAuthFailure,
    isValidSupportId,
    isValidSupportSlug,
    sanitizeSupportSearchQuery,
    sanitizeSupportText,
} from "@/lib/support/validation";
import {
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ServerError,
    ValidationError,
} from "@/lib/errors/domain-errors";

describe("sanitizeSupportSearchQuery", () => {
    it("collapses whitespace and trims", () => {
        expect(sanitizeSupportSearchQuery("  شهادة   إتمام \n ")).toBe("شهادة إتمام");
    });

    it("strips control characters that could smuggle junk into the query string", () => {
        expect(sanitizeSupportSearchQuery("a\u0000b\u001Fc\u007Fd")).toBe("a b c d");
    });

    it("caps the query at the contract length", () => {
        const raw = "س".repeat(SUPPORT_SEARCH_MAX_LENGTH + 50);
        const sanitized = sanitizeSupportSearchQuery(raw);
        expect(sanitized).toHaveLength(SUPPORT_SEARCH_MAX_LENGTH);
    });

    it("never leaves a trailing space after capping", () => {
        const raw = `${"a".repeat(SUPPORT_SEARCH_MAX_LENGTH - 1)} tail`;
        expect(sanitizeSupportSearchQuery(raw).endsWith(" ")).toBe(false);
    });

    it("returns an empty string for null/undefined input", () => {
        expect(sanitizeSupportSearchQuery(null)).toBe("");
        expect(sanitizeSupportSearchQuery(undefined)).toBe("");
    });

    it("keeps legitimate multi-word queries intact", () => {
        expect(sanitizeSupportSearchQuery("استرداد المبلغ من الفاتورة")).toBe("استرداد المبلغ من الفاتورة");
    });
});

describe("sanitizeSupportText", () => {
    it("honours a custom cap", () => {
        expect(sanitizeSupportText("abcdef", 3)).toBe("abc");
    });

    it("is a no-op for already-normalized short input", () => {
        expect(sanitizeSupportText("فيديو لا يعمل", 50)).toBe("فيديو لا يعمل");
    });
});

describe("isValidSupportSlug", () => {
    it("accepts canonical, arabic and versioned slugs", () => {
        expect(isValidSupportSlug("how-to-reset-password")).toBe(true);
        expect(isValidSupportSlug("مقالة-عربية-للتحقق")).toBe(true);
        expect(isValidSupportSlug("faq_v2.1")).toBe(true);
        expect(isValidSupportSlug("a1")).toBe(true);
    });

    it("rejects traversal, separators, spaces and empty values", () => {
        expect(isValidSupportSlug("..")).toBe(false);
        expect(isValidSupportSlug("../etc/passwd")).toBe(false);
        expect(isValidSupportSlug("a/b")).toBe(false);
        expect(isValidSupportSlug("a b")).toBe(false);
        expect(isValidSupportSlug("%2e%2e")).toBe(false);
        expect(isValidSupportSlug("")).toBe(false);
        expect(isValidSupportSlug(null)).toBe(false);
        expect(isValidSupportSlug(undefined)).toBe(false);
    });

    it("rejects values past the length cap", () => {
        expect(isValidSupportSlug("a".repeat(SUPPORT_SLUG_MAX_LENGTH + 1))).toBe(false);
        expect(isValidSupportSlug("a".repeat(SUPPORT_SLUG_MAX_LENGTH))).toBe(true);
    });
});

describe("isValidSupportId", () => {
    it("accepts uuids, ulids and numeric ids", () => {
        expect(isValidSupportId("3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(true);
        expect(isValidSupportId("01H8XYZ8Q2V7RD3T5M6K9W1B4F")).toBe(true);
        expect(isValidSupportId("1024")).toBe(true);
    });

    it("rejects path-shaped or oversized input", () => {
        expect(isValidSupportId("../../admin")).toBe(false);
        expect(isValidSupportId("1/2")).toBe(false);
        expect(isValidSupportId("a b")).toBe(false);
        expect(isValidSupportId("")).toBe(false);
        expect(isValidSupportId("x".repeat(SUPPORT_ID_MAX_LENGTH + 1))).toBe(false);
    });
});

describe("isSupportAuthFailure", () => {
    it("detects the shared 401 taxonomy", () => {
        expect(isSupportAuthFailure(new AuthenticationError())).toBe(true);
    });

    it("ignores unrelated failures, including message-only matches", () => {
        expect(isSupportAuthFailure(new ServerError())).toBe(false);
        expect(isSupportAuthFailure(new AuthorizationError())).toBe(false);
        expect(isSupportAuthFailure(new NotFoundError("missing"))).toBe(false);
        expect(isSupportAuthFailure(new ValidationError())).toBe(false);
        expect(isSupportAuthFailure(new Error("401 unauthorized"))).toBe(false);
        expect(isSupportAuthFailure(null)).toBe(false);
        expect(isSupportAuthFailure(undefined)).toBe(false);
    });
});
