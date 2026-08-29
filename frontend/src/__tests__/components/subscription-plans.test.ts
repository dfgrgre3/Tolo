import { describe, it, expect } from "vitest";
import { groupPlansByTier, planForCycle } from "@/components/billing/SubscriptionPlans";

/**
 * اختبارات تجميع خطط الاشتراك — التبديل بين شهري/سنوي يجب أن يختار
 * سجل الخطة الحقيقي المسعّر من الإدارة، لا تخميناً في الواجهة.
 */
type Plan = Parameters<typeof groupPlansByTier>[0][number];

function makePlan(overrides: Partial<Plan>): Plan {
  return {
    id: "plan-1",
    name: "Basic",
    nameAr: "الأساسية",
    price: 100,
    description: "",
    descriptionAr: "",
    features: [],
    featuresAr: [],
    interval: "MONTHLY",
    ...overrides,
  } as Plan;
}

describe("groupPlansByTier", () => {
  it("groups monthly and yearly variants under one tier via groupKey", () => {
    const tiers = groupPlansByTier([
      makePlan({ id: "m1", groupKey: "basic", interval: "MONTHLY", price: 100 }),
      makePlan({ id: "y1", groupKey: "basic", interval: "YEARLY", price: 1000 }),
    ]);

    expect(tiers).toHaveLength(1);
    expect(tiers[0]?.monthly?.id).toBe("m1");
    expect(tiers[0]?.yearly?.id).toBe("y1");
  });

  it("falls back to the plan id when groupKey is absent", () => {
    const tiers = groupPlansByTier([makePlan({ id: "solo" })]);
    expect(tiers).toHaveLength(1);
    expect(tiers[0]?.groupKey).toBe("solo");
    expect(tiers[0]?.monthly?.id).toBe("solo");
    expect(tiers[0]?.yearly).toBeNull();
  });

  it("keeps separate tiers for separate groupKeys", () => {
    const tiers = groupPlansByTier([
      makePlan({ id: "a", groupKey: "basic" }),
      makePlan({ id: "b", groupKey: "pro" }),
    ]);
    expect(tiers).toHaveLength(2);
  });

  it("handles lifetime-only plans via fallback", () => {
    const tiers = groupPlansByTier([
      makePlan({ id: "life", groupKey: "bundle", interval: "FOREVER", price: 5000 }),
    ]);

    expect(tiers[0]?.monthly).toBeNull();
    expect(tiers[0]?.yearly).toBeNull();
    expect(tiers[0]?.fallback.id).toBe("life");
  });

  it("returns an empty list for no plans", () => {
    expect(groupPlansByTier([])).toEqual([]);
  });
});

describe("planForCycle", () => {
  const fullTier = {
    groupKey: "basic",
    monthly: makePlan({ id: "m", interval: "MONTHLY", price: 100 }),
    yearly: makePlan({ id: "y", interval: "YEARLY", price: 1000 }),
    fallback: makePlan({ id: "m", interval: "MONTHLY", price: 100 }),
  };

  it("picks the matching variant for the selected cycle", () => {
    expect(planForCycle(fullTier, "monthly").id).toBe("m");
    expect(planForCycle(fullTier, "yearly").id).toBe("y");
  });

  it("falls back to monthly when a tier has no yearly variant", () => {
    const monthlyOnly = { ...fullTier, yearly: null };
    expect(planForCycle(monthlyOnly, "yearly").id).toBe("m");
  });

  it("falls back to yearly when a tier has no monthly variant", () => {
    const yearlyOnly = { ...fullTier, monthly: null };
    expect(planForCycle(yearlyOnly, "monthly").id).toBe("y");
  });

  it("uses the fallback for lifetime-only tiers on both cycles", () => {
    const lifetimeOnly = { ...fullTier, monthly: null, yearly: null };
    expect(planForCycle(lifetimeOnly, "monthly").id).toBe("m");
    expect(planForCycle(lifetimeOnly, "yearly").id).toBe("m");
  });

  it("charges the real yearly price, not a client-side guess", () => {
    expect(planForCycle(fullTier, "yearly").price).toBe(1000);
    expect(planForCycle(fullTier, "monthly").price).toBe(100);
  });
});
