/**
 * Phase 2.4 & 2.5 — Domain Boundary Tests
 *
 * يتحقق من أن كل domain جديد يُصدّر الواجهة الصحيحة من index.ts.
 */

import { describe, it, expect } from "vitest";

describe("features/enrollment Domain Boundary (P0-12 / P0-14)", () => {
  it("exports enrollment status types", async () => {
    const mod = await import("@/features/enrollment");
    // API functions
    expect(typeof mod.fetchEnrollmentStatus).toBe("function");
    expect(typeof mod.fetchEnrollmentEligibility).toBe("function");
    expect(typeof mod.enrollInCourse).toBe("function");
    expect(typeof mod.unenrollFromCourse).toBe("function");
    expect(typeof mod.fetchMyCourses).toBe("function");
  });

  it("exports enrollment hooks", async () => {
    const mod = await import("@/features/enrollment");
    expect(typeof mod.useEnrollmentStatus).toBe("function");
    expect(typeof mod.useEnrollmentEligibility).toBe("function");
    expect(typeof mod.useMyCourses).toBe("function");
    expect(typeof mod.useEnrollMutation).toBe("function");
    expect(typeof mod.useUnenrollMutation).toBe("function");
    expect(mod.enrollmentKeys).toBeDefined();
  });
});

describe("features/payments Domain Boundary (P0-12 / P0-14)", () => {
  it("exports payment method constants", async () => {
    const mod = await import("@/features/payments");
    expect(Array.isArray(mod.PAYMENT_METHOD_IDS)).toBe(true);
    expect(mod.PAYMENT_METHOD_IDS).toContain("card");
    expect(mod.PAYMENT_METHOD_IDS).toContain("wallet");
    expect(mod.PAYMENT_METHOD_IDS).toContain("fawry");
    expect(mod.PAYMENT_METHOD_IDS).toContain("internal_wallet");
    expect(typeof mod.PAYMENT_METHOD_META).toBe("object");
  });

  it("exports payment business logic functions", async () => {
    const mod = await import("@/features/payments");
    expect(typeof mod.resolvePaymentAction).toBe("function");
    expect(typeof mod.buildCardIframeUrl).toBe("function");
    expect(typeof mod.buildWalletCheckoutUrl).toBe("function");
    expect(typeof mod.getFawryCode).toBe("function");
    expect(typeof mod.formatEGP).toBe("function");
    expect(typeof mod.validateCoupon).toBe("function");
  });

  it("exports wallet and subscription API gateway", async () => {
    const mod = await import("@/features/payments");
    expect(typeof mod.fetchWalletBalance).toBe("function");
    expect(typeof mod.fetchWalletTransactions).toBe("function");
    expect(typeof mod.fetchSubscriptionPlans).toBe("function");
    expect(typeof mod.fetchCurrentSubscription).toBe("function");
    expect(typeof mod.checkoutSubscription).toBe("function");
    expect(typeof mod.createPayment).toBe("function");
  });

  it("exports payment hooks and mutations", async () => {
    const mod = await import("@/features/payments");
    expect(typeof mod.useWalletBalance).toBe("function");
    expect(typeof mod.useSubscriptionPlans).toBe("function");
    expect(typeof mod.useCurrentSubscription).toBe("function");
    expect(typeof mod.useCheckoutSubscriptionMutation).toBe("function");
    expect(typeof mod.useValidateCouponMutation).toBe("function");
    expect(mod.paymentKeys).toBeDefined();
  });
});

describe("features/gamification Domain Boundary (P0-12 / P0-14)", () => {
  it("exports gamification API functions", async () => {
    const mod = await import("@/features/gamification");
    expect(typeof mod.fetchMyProgress).toBe("function");
    expect(typeof mod.fetchAchievements).toBe("function");
    expect(typeof mod.fetchLeaderboard).toBe("function");
    expect(typeof mod.createCustomGoal).toBe("function");
    expect(typeof mod.updateCustomGoal).toBe("function");
  });

  it("exports gamification hooks", async () => {
    const mod = await import("@/features/gamification");
    expect(typeof mod.useGamification).toBe("function");
    expect(typeof mod.useGamificationProgress).toBe("function");
    expect(typeof mod.useAchievements).toBe("function");
    expect(typeof mod.useLeaderboard).toBe("function");
    expect(typeof mod.useCreateGoalMutation).toBe("function");
    expect(typeof mod.useUpdateGoalMutation).toBe("function");
    expect(mod.gamificationKeys).toBeDefined();
  });
});

describe("features/notifications Domain Boundary (P0-12 / P0-14)", () => {
  it("exports notifications gateway and hooks", async () => {
    const mod = await import("@/features/notifications");
    expect(typeof mod.fetchNotifications).toBe("function");
    expect(typeof mod.markNotificationRead).toBe("function");
    expect(typeof mod.markAllNotificationsRead).toBe("function");
    expect(typeof mod.useNotifications).toBe("function");
    expect(typeof mod.useMarkNotificationReadMutation).toBe("function");
    expect(mod.notificationKeys).toBeDefined();
  });
});

describe("features/community Domain Boundary (P0-12 / P0-14)", () => {
  it("exports community gateway functions", async () => {
    const mod = await import("@/features/community");
    expect(typeof mod.fetchAnnouncements).toBe("function");
    expect(typeof mod.createAnnouncement).toBe("function");
    expect(typeof mod.fetchCommunityUsers).toBe("function");
    expect(typeof mod.fetchChatConversations).toBe("function");
    expect(typeof mod.fetchChatMessages).toBe("function");
    expect(typeof mod.sendChatMessage).toBe("function");
  });

  it("exports community hooks", async () => {
    const mod = await import("@/features/community");
    expect(typeof mod.useAnnouncements).toBe("function");
    expect(typeof mod.useCommunityUsers).toBe("function");
    expect(typeof mod.useChatConversations).toBe("function");
    expect(typeof mod.useChatMessages).toBe("function");
    expect(typeof mod.useCreateAnnouncementMutation).toBe("function");
    expect(typeof mod.useSendMessageMutation).toBe("function");
    expect(mod.communityKeys).toBeDefined();
  });
});
