import { describe, it, expect } from "vitest";
import {
    supportTicketSchema,
    supportMessageSchema,
    supportBugReportSchema,
    supportFeatureRequestSchema,
    supportRatingSchema,
    SUPPORT_ROUTES,
    SUPPORT_TICKET_SUBJECT_MIN,
    SUPPORT_TICKET_BODY_MIN,
} from "@/lib/support/contracts";
import { CUSTOMER_ALLOWED_TRANSITIONS, SupportTicketStatus } from "@thanawy/shared/types/support";

describe("supportTicketSchema", () => {
    it("accepts a valid ticket", () => {
        const res = supportTicketSchema.safeParse({
            subject: "لا أستطيع تشغيل الفيديو",
            description: "عند فتح درس الفيزياء الأول تظهر شاشة سوداء ولا يعمل التشغيل إطلاقاً.",
            categoryId: "technical",
            priority: "HIGH",
        });
        expect(res.success).toBe(true);
    });

    it("rejects short subject and body", () => {
        expect(
            supportTicketSchema.safeParse({ subject: "x".repeat(SUPPORT_TICKET_SUBJECT_MIN - 1), description: "y".repeat(50) }).success,
        ).toBe(false);
        expect(
            supportTicketSchema.safeParse({ subject: "عنوان طويل كفاية", description: "y".repeat(SUPPORT_TICKET_BODY_MIN - 1) }).success,
        ).toBe(false);
    });

    it("defaults priority to NORMAL", () => {
        const res = supportTicketSchema.safeParse({ subject: "عنوان طويل كفاية", description: "y".repeat(30) });
        expect(res.success).toBe(true);
        if (res.success) expect(res.data.priority).toBe("NORMAL");
    });
});

describe("supportMessageSchema", () => {
    it("rejects empty messages", () => {
        expect(supportMessageSchema.safeParse({ body: "   " }).success).toBe(false);
        expect(supportMessageSchema.safeParse({ body: "رد حقيقي" }).success).toBe(true);
    });
});

describe("supportBugReportSchema", () => {
    it("requires reproduction steps", () => {
        const base = {
            subject: "عنوان طويل كفاية",
            description: "y".repeat(30),
            expectedResult: "يعمل",
            actualResult: "لا يعمل",
        };
        expect(supportBugReportSchema.safeParse({ ...base, stepsToReproduce: "قصير" }).success).toBe(false);
        expect(
            supportBugReportSchema.safeParse({ ...base, stepsToReproduce: "1. افتح الدرس 2. اضغط تشغيل 3. لاحظ الشاشة" }).success,
        ).toBe(true);
    });
});

describe("supportFeatureRequestSchema", () => {
    it("requires a use case", () => {
        expect(
            supportFeatureRequestSchema.safeParse({ title: "عنوان طويل كفاية", description: "z".repeat(25), useCase: "قصير" }).success,
        ).toBe(false);
    });
});

describe("supportRatingSchema", () => {
    it("only allows 1-5", () => {
        expect(supportRatingSchema.safeParse({ ticketId: "abc", score: 0 }).success).toBe(false);
        expect(supportRatingSchema.safeParse({ ticketId: "abc", score: 6 }).success).toBe(false);
        expect(supportRatingSchema.safeParse({ ticketId: "abc", score: 5 }).success).toBe(true);
    });
});

describe("SUPPORT_ROUTES", () => {
    it("exposes every required help-center path", () => {
        expect(SUPPORT_ROUTES.root).toBe("/support");
        expect(SUPPORT_ROUTES.tickets).toBe("/support/tickets");
        expect(SUPPORT_ROUTES.ticketById("a/b")).toBe("/support/tickets/a%2Fb");
        expect(SUPPORT_ROUTES.status).toBe("/support/status");
    });
});

describe("CUSTOMER_ALLOWED_TRANSITIONS", () => {
    it("never lets customers reopen arbitrary states", () => {
        expect(CUSTOMER_ALLOWED_TRANSITIONS[SupportTicketStatus.CLOSED]).toContain(SupportTicketStatus.REOPENED);
        expect(CUSTOMER_ALLOWED_TRANSITIONS[SupportTicketStatus.NEW] ?? []).toHaveLength(0);
        expect(CUSTOMER_ALLOWED_TRANSITIONS[SupportTicketStatus.RESOLVED]).toContain(SupportTicketStatus.REOPENED);
    });
});
